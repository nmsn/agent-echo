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
        const lastMsg = session.messages[session.messages.length - 1];
        const isRunning =
          session.status === 'active' && lastMsg?.role === 'user';

        return (
          <button
            key={session.id}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center justify-between px-5 py-2.5 text-sm text-left rounded-lg transition-colors relative ${
              isActive
                ? 'bg-[#2A2A3A] text-white'
                : 'text-[#888888] hover:bg-[#2A2A3A] hover:text-white'
            }`}
            onClick={() => setActiveSession(session.id)}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isRunning ? 'bg-green-500' : 'bg-[#555555]'
                }`}
              />
              <span className="truncate font-medium">{label}</span>
            </span>
            <span className="shrink-0 ml-2 text-xs opacity-60">{duration}</span>
            {isActive && (
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}