# Agent Echo

Electron 应用，用于捕获和显示 Claude Code 的会话事件。

## 功能

- 实时捕获 Claude Code 会话事件
- 多会话支持
- 系统通知
- 进程扫描
- Electron 桌面集成（系统托盘）

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev
```

Claude Code hooks 会在首次运行时自动配置。

## 项目结构

```
agent-echo/
├── packages/
│   ├── hooks/         # Claude Code hook 脚本
│   ├── main/          # Electron 主进程
│   ├── renderer/      # React UI
│   └── shared/        # 共享类型
├── scripts/hooks/     # Hook 安装脚本
└── CLAUDE.md          # 开发规范
```

## 开发

```bash
# 构建所有包
pnpm build

# 手动安装 hooks
pnpm hooks:install

# 卸载 hooks
pnpm hooks:uninstall
```

## 架构

```
Claude Code → Hook Script → HTTP (18765) → BridgeServer → Electron UI
                              ↓
                         Notifications
                              ↓
                         ProcessScanner
```

详见 [CLAUDE.md](CLAUDE.md) 了解开发规范和架构细节。
