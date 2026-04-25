# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Agent Echo 是一个 Electron 应用，用于捕获和显示 Claude Code 的会话事件。

## 架构

```
Claude Code (hook event)
    ↓ HTTP POST (port 18765)
BridgeServer (packages/main)
    ↓ EventEmitter
├── NotificationService (系统通知)
├── ProcessScanner (进程扫描)
└── IPC → Renderer (packages/renderer)
```

### 核心组件

| 包 | 职责 |
|-----|------|
| `packages/hooks` | Claude Code hook 脚本，通过 HTTP 发送事件 |
| `packages/main` | Electron 主进程，包含 BridgeServer、通知、进程扫描 |
| `packages/renderer` | Electron 渲染进程，React UI |
| `packages/shared` | 共享类型定义 |

### BridgeServer 事件流

1. `agent-echo-hook.ts` 接收 Claude Code 的 hook 事件
2. 通过 HTTP POST 发送到 `http://localhost:18765`
3. `BridgeServer.handleMessage()` 分发到对应的 handler
4. Handler 提取内容并 emit 事件

**关键事件类型:**
- `SessionStart` - 会话开始
- `UserPromptSubmit` - 用户输入 (从 `event.data.text` 提取)
- `Stop` - 会话结束 (从 `event.data.last_assistant_message` 提取助手回复)

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式 (并行启动所有包)
pnpm dev

# 构建所有包
pnpm build

# Hook 配置
pnpm hooks:install    # 安装 Claude Code hooks
pnpm hooks:uninstall  # 卸载 hooks
```

## 项目规范

### 导入规范

ESM 项目使用 bundler (electron-vite)，**不要在导入时使用 `.js` 后缀**:

```typescript
// 正确
import { BridgeServer } from './bridge/server';

// 错误
import { BridgeServer } from './bridge/server.js';
```

### Session 和 SessionId

不同事件类型 (SessionStart/UserPromptSubmit/SessionEnd) 使用相同的 `sessionId` 进行关联，优先使用 `sessionId` 查找 session。

### Claude Code Hook 配置

Hook 通过 `scripts/hooks/install.js` 安装到 `~/.claude/settings.json`，会在 Electron 启动时自动检测并配置。
