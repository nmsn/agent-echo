# Agent Echo 重新设计文档

**日期**: 2026-04-21
**状态**: 已批准

## 1. 概述

Agent Echo 是一个双语聊天桥接工具，用于捕获多终端（VSCode、Obsidian、命令行）的 Claude Code 对话，提供全局通知和可选的双语翻译/TTS 朗读功能。

## 2. 核心功能

| 功能 | 默认状态 | 说明 |
|------|---------|------|
| 全局进程扫描 | ✅ 开启 | 扫描所有 Claude Code 进程 |
| Hook 事件捕获 | ✅ 开启 | 通过 Claude Code hooks 接收事件 |
| 通知 | ✅ 开启 | 系统通知 + 菜单栏闪烁 + 声音 |
| 翻译 + TTS | ⚙️ 可配置 | 需开启配置项，显示双语和喇叭按钮 |

## 3. 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Echo App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Unix Socket  │  │  Process     │  │  Translator  │   │
│  │  Bridge      │  │  Scanner     │  │  (MiniMax)   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                               │
│  ┌──────────────────────┴───────────────────────┐     │
│  │              React UI (Renderer)               │     │
│  │  - 消息列表                                    │     │
│  │  - 设置面板                                    │     │
│  │  - TTS 喇叭按钮（配置启用后显示）              │     │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ↑ Unix socket (agent-echo.sock)
         │
┌────────┴───────────────────────────────────────────┐
│              AgentEchoHooks CLI                      │
│  packages/hooks/                                    │
│  - 接收 Claude Code Hook 事件 (stdin)               │
│  - 发送到 Unix socket                              │
└─────────────────────────────────────────────────────┘
         ↑ Hook invoke
         │
┌────────┴───────────────────────────────────────────┐
│  ~/.claude/settings.json                           │
│  Claude Code Hooks                                 │
│  - SessionStart  →  会话开始                       │
│  - UserPromptSubmit → 用户提交 prompt             │
│  - AssistantMessage → AI 回复                      │
│  - SessionEnd    →  会话结束                       │
└───────────────────────────────────────────────────┘
         ↑ Claude Code runs anywhere:
         │ VSCode / Obsidian / Terminal
```

## 4. 组件设计

### 4.1 packages/hooks/ — AgentEchoHooks CLI

**职责**: 轻量 CLI，接收 Claude Code hook 事件，通过 Unix socket 发送给 App。

**事件类型**:
- `SessionStart` — 新会话开始
- `UserPromptSubmit` — 用户提交 prompt
- `AssistantMessage` — AI 回复
- `SessionEnd` — 会话结束

**通信协议**:
- stdin: 接收 Claude Code JSON payload
- Unix socket: 发送到 App

### 4.2 packages/main/ — Electron 主进程

**组件**:

| 组件 | 职责 |
|------|------|
| `BridgeServer` | Unix socket 服务端，接收 Hook CLI 事件 |
| `ProcessScanner` | 定期扫描 Claude Code 进程，作为 Hook 兜底 |
| `NotificationService` | 发送系统通知 + 菜单栏闪烁 + 声音 |
| `Translator` | MiniMax 翻译服务（配置启用） |
| `TTSService` | MiniMax TTS 语音合成（配置启用） |

### 4.3 packages/renderer/ — React UI

**组件**:

| 组件 | 职责 |
|------|------|
| `ChatView` | 消息列表展示 |
| `MessageItem` | 单条消息（双语 + 喇叭按钮） |
| `SettingsPanel` | 翻译/TTS 开关配置 |
| `StatusBar` | 连接状态、进程数 |

### 4.4 packages/shared/ — 共享类型

定义 IPC、Socket 消息、事件类型等共享接口。

## 5. 数据流

### 5.1 消息捕获流程

```
1. Claude Code 触发 hook (SessionStart/UserPromptSubmit/AssistantMessage/SessionEnd)
2. AgentEchoHooks CLI 读取 stdin JSON payload
3. CLI 通过 Unix socket 发送到 BridgeServer
4. BridgeServer 解析事件，更新 AppModel
5. AppModel 触发通知（系统通知 + 闪烁 + 声音）
6. 如果配置启用翻译 → 调用 Translator → 更新消息双语
```

### 5.2 进程扫描兜底

```
1. ProcessScanner 每 5 秒执行 ps 命令扫描 Claude Code 进程
2. 通过 lsof 获取 cwd、transcript 路径
3. 与已知会话比对，发现新进程则创建会话
4. 如果 Hook 遗漏，扫描可作为兜底发现机制
```

### 5.3 TTS 流程

```
1. 用户点击消息的喇叭按钮
2. Renderer 通过 IPC 调用 main 进程 TTS
3. TTSService 调用 MiniMax TTS API
4. 返回音频，播放
```

## 6. 配置项

```typescript
interface Config {
  // 默认功能（始终开启）
  notifications: {
    systemNotification: boolean;  // 系统通知
    menuBarBounce: boolean;      // 菜单栏闪烁
    sound: boolean;              // 声音提示
  };

  // 可选功能（需手动开启）
  translation: {
    enabled: boolean;            // 翻译 + TTS 总开关
    minimaxApiKey: string;      // MiniMax API Key
  };
}
```

## 7. 安装配置

用户需在 `~/.claude/settings.json` 中配置 hooks：

```json
{
  "hooks": {
    "invoke": "agent-echo-hooks",
    "events": ["SessionStart", "UserPromptSubmit", "AssistantMessage", "SessionEnd"]
  }
}
```

或者通过安装脚本自动配置。

## 8. 依赖

- **Electron** — 桌面应用框架
- **React** — UI
- **Vite** — 构建工具
- **ws** — WebSocket/Unix socket
- **express** — 备用 HTTP（如需要）
- **dotenv** — 环境变量

## 9. 待实现

- [ ] packages/hooks/ — AgentEchoHooks CLI
- [ ] BridgeServer — Unix socket 服务端
- [ ] ProcessScanner — 全局进程扫描
- [ ] NotificationService — 系统通知
- [ ] 翻译 + TTS 服务（已有基础实现）
- [ ] React UI 改造
- [ ] 安装配置脚本
