import { useState, useEffect } from 'react';
import { useConversationStore } from '../stores/conversation';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

export function TabBar() {
  const { sessions, activeSessionId, setActiveSession } = useConversationStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (sessions.length === 0) return null;

  const now = Date.now();

  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const label =
          session.sessionTitle ||
          (session.cwd ? session.cwd.split(/[/\\]/).filter(Boolean).pop() : null) ||
          session.source;
        const end = session.endedAt ?? now;
        const duration = formatDuration(end - session.startedAt);
        return (
          <button
            key={session.id}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => setActiveSession(session.id)}
          >
            <span className="truncate">{label}</span>
            <span className="shrink-0 ml-2 text-xs opacity-60">{duration}</span>
          </button>
        );
      })}
    </div>
  );
}
