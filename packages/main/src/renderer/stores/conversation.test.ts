import { describe, it, expect, beforeEach, vi } from 'vitest';
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
