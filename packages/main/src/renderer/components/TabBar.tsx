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
