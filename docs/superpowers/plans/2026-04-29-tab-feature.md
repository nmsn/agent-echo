# Tab Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tab switching to Agent Echo so each Claude terminal gets its own tab, with click-to-switch, auto-switch on new terminal, and auto-close on session end.

**Architecture:**复用 `activeSessionId` 作为 tab 指针，新增 `TabBar` 组件渲染 tab 列表，Store 恢复 `removeSession` 并调整自动切换逻辑。TDD 驱动：先写测试，再写实现。

**Tech Stack:** React, Zustand, Vitest, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-29-tab-feature-design.md`

---

## Task 1: Add `sessionTitle` to Shared Types

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add sessionTitle field**

```typescript
export interface Session {
  id: string;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
  messages: ConversationMessage[];
  startedAt: number;
  lastActivity: number;
  status: 'active' | 'ended';
  endedAt?: number;
  sessionTitle?: string;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: add sessionTitle to shared Session type"
```

---

## Task 2: Store Unit Tests (Red Phase)

**Files:**
- Create: `packages/main/src/renderer/stores/conversation.test.ts`

- [ ] **Step 1: Install test dependencies**

Run: `pnpm -w add -D @testing-library/react @testing-library/jest-dom jsdom`
Expected: Dependencies installed

- [ ] **Step 2: Write failing tests for removeSession**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useConversationStore } from './conversation';
import type { Session } from '@agentecho/shared';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `session_${Date.now()}_${Math.random()}`,
    source: 'claude@12345',
    messages: [],
    startedAt: Date.now(),
    lastActivity: Date.now(),
    status: 'active',
    ...overrides,
  };
}

describe('conversation store - tab operations', () => {
  beforeEach(() => {
    useConversationStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  it('addSession adds a session to the list', () => {
    const session = makeSession({ id: 's1' });
    useConversationStore.getState().addSession(session);
    const { sessions } = useConversationStore.getState();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('s1');
  });

  it('addSession deduplicates by id', () => {
    const session = makeSession({ id: 's1' });
    useConversationStore.getState().addSession(session);
    useConversationStore.getState().addSession(session);
    expect(useConversationStore.getState().sessions).toHaveLength(1);
  });

  it('setActiveSession switches the active tab', () => {
    const s1 = makeSession({ id: 's1' });
    const s2 = makeSession({ id: 's2' });
    const { addSession, setActiveSession } = useConversationStore.getState();
    addSession(s1);
    addSession(s2);
    setActiveSession('s2');
    expect(useConversationStore.getState().activeSessionId).toBe('s2');
  });

  it('removeSession removes session from list', () => {
    const s1 = makeSession({ id: 's1' });
    const s2 = makeSession({ id: 's2' });
    const { addSession, removeSession } = useConversationStore.getState();
    addSession(s1);
    addSession(s2);
    removeSession('s1');
    const { sessions } = useConversationStore.getState();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('s2');
  });

  it('removeSession switches active tab when current tab is removed', () => {
    const s1 = makeSession({ id: 's1' });
    const s2 = makeSession({ id: 's2' });
    const { addSession, setActiveSession, removeSession } = useConversationStore.getState();
    addSession(s1);
    addSession(s2);
    setActiveSession('s1');
    removeSession('s1');
    expect(useConversationStore.getState().activeSessionId).toBe('s2');
  });

  it('removeSession sets null when last tab is removed', () => {
    const s1 = makeSession({ id: 's1' });
    const { addSession, setActiveSession, removeSession } = useConversationStore.getState();
    addSession(s1);
    setActiveSession('s1');
    removeSession('s1');
    expect(useConversationStore.getState().activeSessionId).toBeNull();
  });

  it('removeSession with nonexistent id does nothing', () => {
    const s1 = makeSession({ id: 's1' });
    const { addSession, removeSession } = useConversationStore.getState();
    addSession(s1);
    removeSession('nonexistent');
    expect(useConversationStore.getState().sessions).toHaveLength(1);
  });

  it('addMessage appends message to correct session', () => {
    const s1 = makeSession({ id: 's1' });
    const { addSession, addMessage } = useConversationStore.getState();
    addSession(s1);
    addMessage('s1', {
      id: 'm1',
      role: 'user',
      content: 'hello',
      timestamp: Date.now(),
    });
    const { sessions } = useConversationStore.getState();
    expect(sessions[0].messages).toHaveLength(1);
    expect(sessions[0].messages[0].content).toBe('hello');
  });
});
```

Note: `fetchSessions` filtering test is covered in Task 3 (green phase) since it requires mocking `window.api`.

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd packages/main && npx vitest run src/renderer/stores/conversation.test.ts`
Expected: FAIL — `removeSession` is not a function (store doesn't have it yet)

- [ ] **Step 5: Commit failing tests**

```bash
git add packages/main/src/renderer/stores/conversation.test.ts packages/main/vitest.config.ts
git commit -m "test: add store unit tests for tab operations (red phase)"
```

---

## Task 3: Store Implementation (Green Phase)

**Files:**
- Modify: `packages/main/src/renderer/stores/conversation.ts`

- [ ] **Step 1: Add removeSession, remove markSessionEnded**

In `ConversationState` interface:
- Add `removeSession: (sessionId: string) => void;`
- Remove `markSessionEnded: (sessionId: string) => void;`

In the store implementation:
- Add `removeSession`:
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
- Remove the `markSessionEnded` implementation entirely

- [ ] **Step 2: Update onSessionEnd to use removeSession**

In `subscribeToEvents`, change:
```typescript
const unsubSessionEnd = window.api.onSessionEnd((session) => {
  console.log('[Store] Session ended:', session.id);
  get().removeSession(session.id);
});
```

- [ ] **Step 3: Update onSessionStart to always switch**

In `subscribeToEvents`, change:
```typescript
const unsubSessionStart = window.api.onSessionStart((session) => {
  console.log('[Store] Session started:', session.id);
  get().addSession(session);
  get().setActiveSession(session.id);
});
```

- [ ] **Step 4: Update fetchSessions to filter ended sessions**

```typescript
fetchSessions: async () => {
  try {
    const sessions = await window.api.getSessions();
    const isRunning = await window.api.getBridgeStatus();
    const activeSessions = sessions.filter((s) => s.status === 'active');
    set({ sessions: activeSessions, isBridgeRunning: isRunning });
  } catch (err) {
    console.error('[Store] Failed to fetch sessions:', err);
  }
},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/main && npx vitest run src/renderer/stores/conversation.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Add fetchSessions filtering test**

Add to `conversation.test.ts`:

```typescript
it('fetchSessions filters out ended sessions', async () => {
  // Mock window.api
  const activeSession = makeSession({ id: 'active', status: 'active' });
  const endedSession = makeSession({ id: 'ended', status: 'ended' });
  window.api = {
    getSessions: vi.fn().mockResolvedValue([activeSession, endedSession]),
    getBridgeStatus: vi.fn().mockResolvedValue(true),
  } as any;

  await useConversationStore.getState().fetchSessions();
  const { sessions } = useConversationStore.getState();
  expect(sessions).toHaveLength(1);
  expect(sessions[0].id).toBe('active');
});
```

Run: `cd packages/main && npx vitest run src/renderer/stores/conversation.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/main/src/renderer/stores/conversation.ts
git commit -m "feat: add removeSession, auto-switch, filter ended sessions"
```

---

## Task 4: TabBar Component Tests (Red Phase)

**Files:**
- Create: `packages/main/src/renderer/components/TabBar.test.tsx`
- Modify: `packages/main/vitest.config.ts`

- [ ] **Step 1: Update vitest config for jsdom**

Modify `packages/main/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

- [ ] **Step 2: Write failing TabBar tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar } from './TabBar';
import { useConversationStore } from '../stores/conversation';
import type { Session } from '@agentecho/shared';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `session_${Date.now()}_${Math.random()}`,
    source: 'claude@12345',
    messages: [],
    startedAt: Date.now(),
    lastActivity: Date.now(),
    status: 'active',
    ...overrides,
  };
}

describe('TabBar', () => {
  beforeEach(() => {
    useConversationStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  it('renders nothing when no sessions', () => {
    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a tab for each session', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    const s2 = makeSession({ id: 's2', source: 'claude@222' });
    useConversationStore.setState({ sessions: [s1, s2], activeSessionId: 's1' });

    render(<TabBar />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('displays source when no sessionTitle', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    useConversationStore.setState({ sessions: [s1], activeSessionId: 's1' });

    render(<TabBar />);
    expect(screen.getByText('claude@111')).toBeInTheDocument();
  });

  it('displays sessionTitle when available', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111', sessionTitle: 'My Project' });
    useConversationStore.setState({ sessions: [s1], activeSessionId: 's1' });

    render(<TabBar />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('calls setActiveSession on click', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    const s2 = makeSession({ id: 's2', source: 'claude@222' });
    useConversationStore.setState({ sessions: [s1, s2], activeSessionId: 's1' });

    render(<TabBar />);
    fireEvent.click(screen.getByText('claude@222'));
    expect(useConversationStore.getState().activeSessionId).toBe('s2');
  });

  it('applies active style to current tab', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    const s2 = makeSession({ id: 's2', source: 'claude@222' });
    useConversationStore.setState({ sessions: [s1, s2], activeSessionId: 's1' });

    render(<TabBar />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].className).toContain('bg-primary');
    expect(tabs[1].className).not.toContain('bg-primary');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/main && npx vitest run src/renderer/components/TabBar.test.tsx`
Expected: FAIL — cannot find module `./TabBar`

- [ ] **Step 4: Commit failing tests**

```bash
git add packages/main/src/renderer/components/TabBar.test.tsx packages/main/vitest.config.ts
git commit -m "test: add TabBar component tests (red phase)"
```

---

## Task 5: TabBar Component Implementation (Green Phase)

**Files:**
- Create: `packages/main/src/renderer/components/TabBar.tsx`

- [ ] **Step 1: Create TabBar component**

```tsx
import { useConversationStore } from '../stores/conversation';

export function TabBar() {
  const { sessions, activeSessionId, setActiveSession } = useConversationStore();

  if (sessions.length === 0) return null;

  return (
    <div className="flex border-b border-border bg-card overflow-x-auto">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const label = session.sessionTitle || session.source;
        return (
          <button
            key={session.id}
            role="tab"
            aria-selected={isActive}
            className={`px-4 py-2 text-sm whitespace-nowrap border-r border-border transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => setActiveSession(session.id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd packages/main && npx vitest run src/renderer/components/TabBar.test.tsx`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/renderer/components/TabBar.tsx
git commit -m "feat: add TabBar component"
```

---

## Task 6: ChatView Update (Pure Refactor)

**Files:**
- Modify: `packages/main/src/renderer/components/ChatView.tsx`

Note: This is a pure refactor — removing the source label bar because tab now shows this info. No behavioral change, no new test needed. The existing "暂无活动会话" empty state already handles the last-tab-closed case.

- [ ] **Step 1: Remove source label bar from ChatView**

Remove this block from the return statement:
```tsx
<div className="px-4 py-2 border-b border-border bg-card flex items-center gap-2">
  <span className="text-sm text-foreground">{activeSession.source}</span>
  {isEnded && (
    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">已结束</span>
  )}
</div>
```

Also remove the `isEnded` variable since it's no longer used.

The component should now render just the message list:
```tsx
return (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {activeSession.messages.length === 0 ? (
        <p className="text-muted-foreground text-sm">暂无消息</p>
      ) : (
        activeSession.messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            sessionId={activeSession.id}
            showTranslation={settings.translationEnabled}
            onSpeak={onSpeak}
          />
        ))
      )}
    </div>
  </div>
);
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/renderer/components/ChatView.tsx
git commit -m "refactor: remove source label from ChatView (now shown in TabBar)"
```

---

## Task 7: App.tsx Integration

**Files:**
- Modify: `packages/main/src/renderer/App.tsx`

- [ ] **Step 1: Import and insert TabBar**

Add import:
```typescript
import { TabBar } from './components/TabBar';
```

Insert `<TabBar />` between `<header>` and `<StatusBar>`:
```tsx
return (
  <div className="h-screen flex flex-col bg-background overflow-hidden">
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <h1 className="text-lg font-semibold text-foreground">Agent Echo</h1>
      <button ...>...</button>
    </header>

    <TabBar />

    <StatusBar isBridgeRunning={isBridgeRunning} activeCount={activeCount} totalCount={sessions.length} />

    {showSettings && (
      <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
    )}

    <main className="flex-1 overflow-y-auto">
      <ChatView onSpeak={handleSpeak} />
    </main>
    <ComposeBar enabled={settings.translationEnabled} />
  </div>
);
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/renderer/App.tsx
git commit -m "feat: integrate TabBar into App layout"
```

---

## Task 8: Integration Tests

**Files:**
- Create: `packages/main/src/renderer/__tests__/tab-integration.test.tsx`

Note: The `__tests__/` directory does not exist yet — it will be created automatically.

- [ ] **Step 1: Write integration tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useConversationStore } from '../stores/conversation';
import { TabBar } from '../components/TabBar';
import type { Session, ConversationMessage } from '@agentecho/shared';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `session_${Date.now()}_${Math.random()}`,
    source: 'claude@12345',
    messages: [],
    startedAt: Date.now(),
    lastActivity: Date.now(),
    status: 'active',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: 'test message',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('Tab integration', () => {
  beforeEach(() => {
    useConversationStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  it('new session creates tab and auto-switches', () => {
    const { addSession, setActiveSession } = useConversationStore.getState();
    const s1 = makeSession({ id: 's1', source: 'claude@111' });

    render(<TabBar />);

    // Simulate SessionStart
    addSession(s1);
    setActiveSession(s1.id);

    expect(screen.getByRole('tab')).toBeDefined();
    expect(useConversationStore.getState().activeSessionId).toBe('s1');
  });

  it('clicking tab switches active session', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    const s2 = makeSession({ id: 's2', source: 'claude@222' });
    useConversationStore.setState({ sessions: [s1, s2], activeSessionId: 's1' });

    render(<TabBar />);

    fireEvent.click(screen.getByText('claude@222'));
    expect(useConversationStore.getState().activeSessionId).toBe('s2');
  });

  it('session end removes tab', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    const s2 = makeSession({ id: 's2', source: 'claude@222' });
    useConversationStore.setState({ sessions: [s1, s2], activeSessionId: 's1' });

    const { removeSession } = useConversationStore.getState();
    removeSession('s1');

    const { sessions } = useConversationStore.getState();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('s2');
  });

  it('last tab removed results in empty state', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    useConversationStore.setState({ sessions: [s1], activeSessionId: 's1' });

    const { removeSession } = useConversationStore.getState();
    removeSession('s1');

    const { sessions, activeSessionId } = useConversationStore.getState();
    expect(sessions).toHaveLength(0);
    expect(activeSessionId).toBeNull();
  });

  it('switching tab updates which session messages are visible', () => {
    const s1 = makeSession({ id: 's1', source: 'claude@111' });
    const s2 = makeSession({ id: 's2', source: 'claude@222' });
    s1.messages = [makeMessage({ content: 'hello from s1' })];
    s2.messages = [makeMessage({ content: 'hello from s2' })];
    useConversationStore.setState({ sessions: [s1, s2], activeSessionId: 's1' });

    const { setActiveSession } = useConversationStore.getState();

    // Verify s1 is active
    let active = useConversationStore.getState().sessions.find(
      (s) => s.id === useConversationStore.getState().activeSessionId
    );
    expect(active?.messages[0].content).toBe('hello from s1');

    // Switch to s2
    setActiveSession('s2');
    active = useConversationStore.getState().sessions.find(
      (s) => s.id === useConversationStore.getState().activeSessionId
    );
    expect(active?.messages[0].content).toBe('hello from s2');
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `cd packages/main && npx vitest run src/renderer/__tests__/tab-integration.test.tsx`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/renderer/__tests__/tab-integration.test.tsx
git commit -m "test: add tab integration tests"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run all tests**

Run: `cd packages/main && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "feat: complete tab switching feature with TDD"
```

- [ ] **Step 4: Manual verification checklist**

- 启动两个 Claude 终端，确认 tab 自动创建和切换
- 点击不同 tab，确认对话内容切换
- 关闭一个终端，确认 tab 消失
- 6+ 个终端同时运行，确认 tab 可水平滚动
- 最后一个 tab 关闭，确认显示"暂无活动会话"
