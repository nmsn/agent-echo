import { useState } from 'react';
import { Search } from 'lucide-react';
import { useConversationStore } from '../stores/conversation';

const KIND_AVATAR: Record<string, { bg: string; text: string }> = {
  code:     { bg: 'oklch(78% 0.110 60)',  text: 'oklch(20% 0.02 60)' },
  research: { bg: 'oklch(74% 0.105 200)', text: 'oklch(18% 0.02 220)' },
  data:     { bg: 'oklch(76% 0.130 145)', text: 'oklch(18% 0.02 145)' },
  devops:   { bg: 'oklch(70% 0.130 320)', text: 'oklch(98% 0.005 320)' },
  docs:     { bg: 'oklch(75% 0.110 100)', text: 'oklch(20% 0.02 100)' },
};

function getInitials(title: string): string {
  return title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function SessionList() {
  const { sessions, activeSessionId, setActiveSession } = useConversationStore();
  const [query, setQuery] = useState('');

  const filtered = query
    ? sessions.filter(s => {
        const q = query.toLowerCase();
        const title = s.sessionTitle || s.cwd?.split(/[/\\]/).pop() || s.source || '';
        return title.toLowerCase().includes(q);
      })
    : sessions;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
          style={{ background: 'oklch(0% 0 0 / 0.25)', border: '1px solid var(--border-soft)', color: 'var(--dim)' }}
        >
          <Search className="w-4 h-4 shrink-0" />
          <input
            type="search"
            placeholder="搜索会话或消息…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
            style={{ color: 'var(--fg)' }}
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0% 0 0 / 0.3)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>⌘K</kbd>
        </div>
      </div>

      {/* Session List */}
      <ul className="flex-1 overflow-y-auto py-2 px-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm" style={{ color: 'var(--dim)' }}>没有匹配的会话</li>
        )}
        {filtered.map(session => {
          const isActive = session.id === activeSessionId;
          const title = session.sessionTitle || session.cwd?.split(/[/\\]/).pop() || session.source || '—';
          const kind = (session as any).kind || 'code';
          const colors = KIND_AVATAR[kind] || KIND_AVATAR.code;
          const lastMsg = session.messages[session.messages.length - 1];
          const preview = lastMsg?.content?.slice(0, 60) || '';
          const initials = getInitials(title);

          return (
            <li
              key={session.id}
              role="option"
              aria-selected={isActive}
              onClick={() => setActiveSession(session.id)}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 transition-colors"
              style={{
                background: isActive ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border)' : 'transparent'}`,
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: colors.bg, color: colors.text, fontFamily: 'var(--font-mono)' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{title}</div>
                <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{preview}</div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div
        className="flex items-center gap-2 py-3 px-4 border-t text-xs"
        style={{ borderColor: 'var(--border-soft)', color: 'var(--muted)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: 'var(--live)', boxShadow: '0 0 6px oklch(72% 0.155 145 / 0.5)' }}
        />
        <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{sessions.length} 个终端在线</span>
        <span style={{ color: 'var(--dim)' }}>·</span>
        <span>持续监听中</span>
      </div>
    </div>
  );
}