import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

    act(() => {
      addSession(s1);
      setActiveSession(s1.id);
    });

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

    let active = useConversationStore.getState().sessions.find(
      (s) => s.id === useConversationStore.getState().activeSessionId
    );
    expect(active?.messages[0].content).toBe('hello from s1');

    setActiveSession('s2');
    active = useConversationStore.getState().sessions.find(
      (s) => s.id === useConversationStore.getState().activeSessionId
    );
    expect(active?.messages[0].content).toBe('hello from s2');
  });
});
