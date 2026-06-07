import { Copy, Download, MoreHorizontal } from 'lucide-react';
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

export function ConversationHeader() {
  const { sessions, activeSessionId } = useConversationStore();
  const session = sessions.find(s => s.id === activeSessionId);

  if (!session) {
    return (
      <header className="h-14 px-6 flex items-center border-b" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--dim)' }}>—</span>
      </header>
    );
  }

  const title = session.sessionTitle || session.cwd?.split(/[/\\]/).pop() || session.source || '—';
  const kind = (session as any).kind || 'code';
  const colors = KIND_AVATAR[kind] || KIND_AVATAR.code;
  const initials = getInitials(title);
  const status = session.status === 'active' ? '进行中' : '已结束';
  const isActive = session.status === 'active';

  return (
    <header
      className="h-14 px-6 flex items-center justify-between border-b shrink-0"
      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg)' }}
    >
      {/* Left: Avatar + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: colors.bg, color: colors.text, fontFamily: 'var(--font-mono)' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate" style={{ color: 'var(--fg)' }}>{title}</h2>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'oklch(28% 0.060 145 / 0.35)', color: 'var(--live)' }}
            >
              只读监听
            </span>
            <span style={{ color: 'var(--dim)' }}>·</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {kind.toUpperCase()}
            </span>
            <span style={{ color: 'var(--dim)' }}>·</span>
            <span className="flex items-center gap-1">
              {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--live)' }} />}
              <span>{status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors"
          style={{ borderColor: 'var(--border-soft)', color: 'var(--muted)', background: 'transparent' }}
          title="复制整段对话"
        >
          <Copy className="w-3.5 h-3.5" />
          复制
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors"
          style={{ borderColor: 'var(--border-soft)', color: 'var(--muted)', background: 'transparent' }}
          title="导出为 Markdown"
        >
          <Download className="w-3.5 h-3.5" />
          导出
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--muted)', background: 'transparent' }}
          title="更多"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}