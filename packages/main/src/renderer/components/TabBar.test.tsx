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
