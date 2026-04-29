# Tab Feature Design

## Context

Agent Echo 目前没有 tab 切换功能。当多个 Claude 终端同时运行时，用户无法区分和切换不同终端的对话。需要添加 tab 功能，每个 Claude 终端对应一个 tab，用户可点击切换查看不同对话。

## Requirements

1. 每个 Claude 终端自动创建一个 tab
2. Tab 显示会话标题 + source 标识（`sessionTitle || source`）
3. 点击 tab 切换对话内容
4. 新终端连接时自动切换到对应 tab（总是切换，不只在无活跃 tab 时）
5. 会话结束时 tab 自动关闭，消息历史从 renderer store 中移除（main process 有持久化，可重新 fetch）
6. Tab 在 header 下方 sticky 定位，不随对话列表滚动
7. 多个 tab 时水平滚动，不折行
8. 最后一个 tab 关闭时，ChatView 显示"暂无活动会话"
9. TDD 驱动开发，覆盖 Store 单元测试、组件测试、集成测试

## Architecture

### Prerequisite: Add `sessionTitle` to Shared Types

`sessionTitle` 已存在于 bridge types 和 Session 对象中（hook script 提取），但 shared types 缺少此字段。需要先在 `packages/shared/src/index.ts` 的 `Session` 接口中添加 `sessionTitle?: string`。

### Data Model

复用现有 `activeSessionId` 作为当前 tab 指针，`sessions` 数组作为 tab 列表。

```typescript
interface ConversationState {
  sessions: Session[];
  activeSessionId: string | null;
  // ... existing
}
```

### Store Changes

恢复 `removeSession` 方法：

```typescript
removeSession: (sessionId) =>
  set((state) => ({
    sessions: state.sessions.filter((s) => s.id !== sessionId),
    activeSessionId:
      state.activeSessionId === sessionId
        ? state.sessions.find((s) => s.id !== sessionId)?.id || null
        : state.activeSessionId,
  })),
```

`subscribeToEvents` 中 `onSessionEnd` 调用 `removeSession`。

`onSessionStart` 中总是调用 `setActiveSession(session.id)`（总是切换到新 tab）。

`fetchSessions` 中过滤掉已结束的会话：

```typescript
fetchSessions: async () => {
  const sessions = await window.api.getSessions();
  const activeSessions = sessions.filter((s) => s.status === 'active');
  set({ sessions: activeSessions, isBridgeRunning: isRunning });
},
```

### Component Structure

```
App.tsx
├── header (不变)
├── TabBar (新增，sticky)
│   └── TabItem × N
├── StatusBar (不变)
├── ChatView (移除顶部 source 标签栏)
└── ComposeBar (不变)
```

### TabBar Component

- 水平排列所有 session 的 tab，溢出时水平滚动（`overflow-x-auto`）
- 每个 tab 显示：`session.sessionTitle || session.source`
- 当前活跃 tab 高亮（`bg-primary text-primary-foreground`）
- 点击 tab 调用 `setActiveSession(id)`

### ChatView Changes

移除顶部显示 source 的 div 块（包含 `{activeSession.source}` 的标题栏），因为 tab 已经展示了此信息。保留消息列表和滚动逻辑。

## TDD Strategy

### Step 1: Store Unit Tests (`conversation.test.ts`)

```
- 新增 session 时 sessions 数组增长
- setActiveSession 切换当前 tab
- removeSession 后该 session 从 sessions 中移除
- removeSession 当前 tab 被移除时自动切换到下一个
- 新 session 到来时总是自动切换到该 tab
- fetchSessions 过滤已结束的会话
```

### Step 2: TabBar Component Tests (`TabBar.test.tsx`)

```
- 渲染所有 session 为 tab
- 点击 tab 调用 setActiveSession
- 当前 tab 高亮样式
- 无 session 时不渲染
- tab 显示标题（有 sessionTitle 时）或 source（无 sessionTitle 时）
- 多 tab 时容器可水平滚动
```

### Step 3: Integration Tests (`tab-integration.test.tsx`)

```
- SessionStart → tab 出现 → 自动切换
- 点击不同 tab → ChatView 显示对应消息
- SessionEnd → tab 消失 → ChatView 显示空状态
```

## Edge Cases

- **setActiveSession 竞态：** 如果 tab 点击时 session 已被移除，setActiveSession 设置的 id 在 sessions 中找不到，ChatView 回退到 `sessions[0]` 或显示空状态，不会崩溃。
- **removeSession 不存在的 id：** filter 无影响，activeSessionId 不变。
- **addSession 重复检查：** 如果 session 重连，BridgeServer 已有去重逻辑，不会重复添加。
- **Tab 溢出：** TabBar 容器 `overflow-x-auto`，支持水平滚动。

## Files to Modify

| File | Operation | Description |
|------|-----------|-------------|
| `packages/shared/src/index.ts` | Modify | Session 接口添加 `sessionTitle?: string` |
| `packages/main/src/renderer/components/TabBar.tsx` | Create | Tab 切换组件 |
| `packages/main/src/renderer/components/TabBar.test.tsx` | Create | 组件测试 |
| `packages/main/src/renderer/stores/conversation.ts` | Modify | 恢复 removeSession，新 session 自动切换，fetchSessions 过滤 |
| `packages/main/src/renderer/stores/conversation.test.ts` | Create | Store 单元测试 |
| `packages/main/src/renderer/App.tsx` | Modify | 插入 TabBar，调整布局 |
| `packages/main/src/renderer/components/ChatView.tsx` | Modify | 移除顶部 source 标签栏 |
| `packages/main/src/renderer/__tests__/tab-integration.test.tsx` | Create | 集成测试 |

## Verification

1. `pnpm test` — 所有测试通过
2. `pnpm build` — 构建无报错
3. 手动验证：启动两个 Claude 终端，确认 tab 自动创建和切换
