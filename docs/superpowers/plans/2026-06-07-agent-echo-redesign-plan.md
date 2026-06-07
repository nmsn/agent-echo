# Agent Echo Layout & Theme Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Agent Echo UI to match the design document: oklch warm dark theme, 340px sidebar + conversation layout, session list, dual-pane translation composer.

**Architecture:** Replace the current KPI-card dashboard layout with a sidebar (session list) + conversation (messages + composer) layout. Apply a warm oklch dark theme throughout. The existing translation/speech IPC bridge remains unchanged.

**Tech Stack:** React 18, Tailwind CSS v4, motion/react, lucide-react, zustand

---

## Task 1: Theme CSS — Replace Variables with oklch Warm Dark

**Files:**
- Modify: `packages/main/src/renderer/index.css`

- [ ] **Step 1: Read current index.css**

Read `packages/main/src/renderer/index.css` to confirm existing variable names.

- [ ] **Step 2: Replace CSS variables with oklch theme**

Replace the entire `:root` block and `@theme inline` block with:

```css
:root {
  --bg:          oklch(17% 0.011 50);
  --sidebar:     oklch(14% 0.009 50);
  --surface:     oklch(21% 0.013 50);
  --surface-2:   oklch(25% 0.014 50);
  --surface-3:   oklch(28% 0.014 50);
  --code-bg:     oklch(13% 0.012 50);
  --fg:          oklch(96% 0.007 60);
  --muted:       oklch(72% 0.011 60);
  --dim:         oklch(54% 0.010 60);
  --border:      oklch(30% 0.013 50);
  --border-soft: oklch(25% 0.012 50);
  --accent:        oklch(70% 0.145 40);
  --accent-hover:  oklch(75% 0.150 40);
  --accent-soft:   oklch(33% 0.075 40);
  --accent-ring:   oklch(70% 0.145 40 / 0.35);
  --live:    oklch(72% 0.155 145);
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'IBM Plex Mono', Menlo, monospace;
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px;
  --shadow-1: 0 1px 0 oklch(0% 0 0 / 0.4), 0 1px 2px oklch(0% 0 0 / 0.3);
  --shadow-2: 0 8px 24px oklch(0% 0 0 / 0.45), 0 2px 6px oklch(0% 0 0 / 0.35);
}

@theme inline {
  --color-bg: var(--bg);
  --color-sidebar: var(--sidebar);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-dim: var(--dim);
  --color-border: var(--border);
  --color-border-soft: var(--border-soft);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
  --color-accent-ring: var(--accent-ring);
  --color-live: var(--live);
  --color-code-bg: var(--code-bg);
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
}
```

Also update the `@layer base` body styles to use `--fg` for color and remove any explicit hsl values:

```css
@layer base {
  * { box-sizing: border-box; border-color: var(--border); }
  html, body { height: 100%; }
  body {
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    color: var(--fg);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
  }
  ::selection { background: var(--accent-soft); color: var(--fg); }
}
```

- [ ] **Step 3: Verify dev server starts without CSS errors**

Run: `cd /Users/nmsn/Studio/agent-echo && pnpm dev`
Expected: Vite dev server starts, no CSS parsing errors in terminal

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/renderer/index.css
git commit -m "refactor: apply oklch warm dark theme to index.css"
```

---

## Task 2: SessionList Component — New Sidebar Component

**Files:**
- Create: `packages/main/src/renderer/components/SessionList.tsx`
- Modify: `packages/main/src/renderer/stores/conversation.ts` (add `kind` field if missing)

- [ ] **Step 1: Check Session type for `kind` field**

Read `packages/shared/src/index.ts` or wherever `Session` is defined. Confirm it has a `kind` field (code/research/data/devops/docs). If not, add it:

```typescript
// In packages/shared/src/index.ts (or wherever Session is defined)
export interface Session {
  id: string;
  kind?: 'code' | 'research' | 'data' | 'devops' | 'docs'; // add if missing
  sessionTitle?: string;
  cwd?: string;
  source?: string;
  startedAt: number;
  endedAt?: number;
  status: 'active' | 'ended';
  messages: ConversationMessage[];
}
```

- [ ] **Step 2: Create SessionList.tsx**

Create `packages/main/src/renderer/components/SessionList.tsx`:

```tsx
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
          const kind = session.kind || 'code';
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
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: colors.bg, color: colors.text, fontFamily: 'var(--font-mono)' }}
              >
                {initials}
              </div>
              {/* Body */}
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
        className="flex items-center justify-center gap-2 py-3 px-4 border-t text-xs"
        style={{ borderColor: 'var(--border-soft)', color: 'var(--muted)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--live)', boxShadow: '0 0 6px oklch(72% 0.155 145 / 0.5)' }} />
        <span>持续监听中</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/renderer/components/SessionList.tsx
git add packages/shared/src/ # if kind field was added
git commit -m "feat: add SessionList component with kind-based avatars"
```

---

## Task 3: ConversationHeader Component — New Header

**Files:**
- Create: `packages/main/src/renderer/components/ConversationHeader.tsx`

- [ ] **Step 1: Create ConversationHeader.tsx**

```tsx
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
  const kind = session.kind || 'code';
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/main/src/renderer/components/ConversationHeader.tsx
git commit -m "feat: add ConversationHeader component"
```

---

## Task 4: MessageItem Redesign — Kind Tags + Bubble Styles

**Files:**
- Modify: `packages/main/src/renderer/components/MessageItem.tsx`

- [ ] **Step 1: Read current MessageItem.tsx**

Read `packages/main/src/renderer/components/MessageItem.tsx` in full before modifying.

- [ ] **Step 2: Replace MessageItem.tsx**

Replace the entire file content with:

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Languages, Copy, Loader2 } from 'lucide-react';
import type { ConversationMessage } from '@agentecho/shared';
import { useConversationStore } from '../stores/conversation';

interface MessageItemProps {
  message: ConversationMessage;
  sessionId: string;
  showTranslation: boolean;
  onSpeak?: (content: string) => void;
}

type TranslationStatus = 'idle' | 'translating' | 'done' | 'error';

const KIND_TAG_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  progress: { color: 'oklch(74% 0.105 200)', bg: 'oklch(74% 0.105 200 / 0.12)', border: 'oklch(74% 0.105 200 / 0.25)' },
  finding:  { color: 'oklch(70% 0.145 40)', bg: 'oklch(33% 0.075 40)', border: 'oklch(70% 0.145 40 / 0.3)' },
  decision: { color: 'oklch(76% 0.130 145)', bg: 'oklch(76% 0.130 145 / 0.12)', border: 'oklch(76% 0.130 145 / 0.25)' },
  summary:  { color: 'oklch(78% 0.110 60)', bg: 'oklch(78% 0.110 60 / 0.12)', border: 'oklch(78% 0.110 60 / 0.25)' },
};

const KIND_LABELS: Record<string, string> = {
  progress: '进度',
  finding: '发现',
  decision: '决策',
  summary: '总结',
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function formatText(raw: string) {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function MessageItem({ message, sessionId, showTranslation, onSpeak }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [hovered, setHovered] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('idle');
  const [translatedText, setTranslatedText] = useState('');
  const [tokenUsage, setTokenUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const addTokenUsage = useConversationStore(s => s.addTokenUsage);

  // Use message.kind if available, else default to 'progress'
  const kind = (message as any).kind || 'progress';
  const kindStyle = KIND_TAG_STYLES[kind] || KIND_TAG_STYLES.progress;
  const kindLabel = KIND_LABELS[kind] || '进度';

  const handleSpeak = () => onSpeak?.(message.content);

  const handleTranslate = async () => {
    if (translationStatus === 'translating') return;
    if (!showTranslation) return;

    const textToTranslate = message.cleaned || message.content;
    setTranslationStatus('translating');
    setTranslatedText('');

    try {
      const result = await window.api.translateRequest(message.id, textToTranslate, 'translate');
      if (result.success && result.translated) {
        setTranslatedText(result.translated);
        setTranslationStatus('done');
        if (result.usage) {
          setTokenUsage(result.usage);
          addTokenUsage(result.usage.inputTokens, result.usage.outputTokens);
        }
      } else {
        setTranslatedText(result.error || '翻译失败');
        setTranslationStatus('error');
      }
    } catch (err) {
      setTranslatedText(err instanceof Error ? err.message : '翻译失败');
      setTranslationStatus('error');
    }
  };

  const handleCopy = async () => {
    const text = translatedText || message.content;
    const payload = text + '\n\n— ' + (message as any).name + ' · ' + formatTime(message.createdAt);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {}
  };

  const ts = formatTime(message.createdAt);

  return (
    <article
      className="grid grid-cols-[32px_1fr] gap-3 max-w-[880px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[11px] font-semibold shrink-0"
        style={{ background: 'var(--accent)', color: 'oklch(20% 0.01 50)', fontFamily: 'var(--font-mono)' }}
      >
        {(message as any).name?.[0]?.toUpperCase() || 'A'}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold" style={{ color: 'var(--fg)' }}>{(message as any).name || 'Agent'}</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
            style={{ color: kindStyle.color, background: kindStyle.bg, border: `1px solid ${kindStyle.border}`, letterSpacing: '0.08em' }}
          >
            {kindLabel}
          </span>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{ts}</span>
        </div>

        {/* Bubble */}
        <div
          className="relative px-3.5 py-3 rounded-[14px] text-sm leading-relaxed cursor-pointer"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderTopLeftRadius: '4px',
            color: 'var(--fg)',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: formatText(message.content) }} />

          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 4, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute -bottom-1 right-1 flex items-center gap-0.5 p-0.5 rounded-lg"
                style={{ background: 'var(--surface-2)' }}
              >
                <button
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--dim)' }}
                  onClick={handleSpeak}
                  title="朗读"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
                {showTranslation && (
                  <button
                    className="p-1 rounded-md transition-colors"
                    style={{ color: 'var(--dim)' }}
                    onClick={handleTranslate}
                    disabled={translationStatus === 'translating'}
                    title={translationStatus === 'translating' ? '翻译中…' : '翻译'}
                  >
                    {translationStatus === 'translating' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Languages className="w-3 h-3" />
                    )}
                  </button>
                )}
                <button
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--dim)' }}
                  onClick={handleCopy}
                  title="复制"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Translation Panel */}
        {showTranslation && translationStatus === 'translating' && (
          <div
            className="px-3.5 py-2.5 text-xs rounded-r-lg animate-pulse"
            style={{ background: 'oklch(15% 0.012 50)', border: '1px solid var(--border-soft)', borderLeft: '2px solid var(--accent)', color: 'var(--dim)' }}
          >
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              翻译中…
            </div>
          </div>
        )}

        {showTranslation && translatedText && translationStatus !== 'translating' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="px-3.5 py-2.5 text-xs rounded-r-lg"
            style={{ background: 'oklch(15% 0.012 50)', border: '1px solid var(--border-soft)', borderLeft: '2px solid var(--accent)', color: 'var(--muted)' }}
          >
            <span
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1.5"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', letterSpacing: '0.08em' }}
            >
              译文 · 中文
            </span>
            <div dangerouslySetInnerHTML={{ __html: formatText(translatedText) }} />
            {tokenUsage && (
              <div className="mt-1 text-[10px]" style={{ color: 'var(--dim)' }}>
                请求 {tokenUsage.inputTokens} · 响应 {tokenUsage.outputTokens} tokens
              </div>
            )}
          </motion.div>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/nmsn/Studio/agent-echo && pnpm build --filter @agentecho/main 2>&1 | head -30`
Expected: No TypeScript errors in MessageItem.tsx

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/renderer/components/MessageItem.tsx
git commit -m "refactor: redesign MessageItem with kind tags and bubble styles"
```

---

## Task 5: ComposeBar Redesign — Dual-Pane Translation

**Files:**
- Modify: `packages/main/src/renderer/components/ComposeBar.tsx`

- [ ] **Step 1: Read current ComposeBar.tsx**

Read `packages/main/src/renderer/components/ComposeBar.tsx` in full before modifying.

- [ ] **Step 2: Replace ComposeBar.tsx**

Replace the entire file content with:

```tsx
import { useState } from 'react';
import { Languages, Copy, Check, RotateCcw, ChevronUp, Loader2 } from 'lucide-react';
import { useConversationStore } from '../stores/conversation';

interface ComposeBarProps {
  enabled: boolean;
}

type ComposeStatus = 'idle' | 'translating' | 'done' | 'error';

const TONE_CHIPS = ['专业', '友好', '简洁'];
const DOMAIN_CHIPS = [
  { key: 'code', label: '代码' },
  { key: 'ops', label: '运维' },
  { key: 'docs', label: '文档' },
  { key: 'general', label: '通用' },
];

export function ComposeBar({ enabled }: ComposeBarProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<ComposeStatus>('idle');
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTone, setActiveTone] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState('general');
  const [history, setHistory] = useState<Array<{ zh: string; en: string; ts: number }>>([]);
  const activeSessionId = useConversationStore(s => s.activeSessionId);
  const sessions = useConversationStore(s => s.sessions);
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const targetName = activeSession?.sessionTitle || activeSession?.cwd?.split(/[/\\]/).pop() || activeSession?.source || '—';

  if (!enabled) return null;

  const handleTranslate = async () => {
    if (!input.trim() || status === 'translating') return;

    setStatus('translating');
    setResult('');

    try {
      const res = await window.api.translateRequest(
        'compose-' + Date.now(),
        input.trim(),
        'compose'
      );
      if (res.success && res.translated) {
        setResult(res.translated);
        setStatus('done');
        const item = { zh: input.trim(), en: res.translated, ts: Date.now() };
        setHistory(prev => [item, ...prev.filter(h => h.zh !== item.zh)].slice(0, 6));
      } else {
        setResult(res.error || '翻译失败');
        setStatus('error');
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : '翻译失败');
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const payload = result + `\n\n— translated for ${targetName}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const handleRetry = () => {
    if (!input.trim()) return;
    setStatus('translating');
    setResult('');
    setTimeout(async () => {
      try {
        const res = await window.api.translateRequest('compose-' + Date.now(), input.trim(), 'compose');
        if (res.success && res.translated) {
          setResult(res.translated);
          setStatus('done');
        } else {
          setResult(res.error || '翻译失败');
          setStatus('error');
        }
      } catch (err) {
        setResult(err instanceof Error ? err.message : '翻译失败');
        setStatus('error');
      }
    }, 500 + Math.random() * 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleTranslate();
    }
  };

  return (
    <div
      className="px-6 py-3.5 border-t shrink-0"
      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 min-h-6">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--accent)', letterSpacing: '0.14em' }}
          >
            翻译草稿
          </span>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px]"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', color: 'var(--muted)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            目标 <span className="font-semibold" style={{ color: 'var(--fg)' }}>{targetName}</span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
          style={{ color: 'var(--dim)', background: 'transparent' }}
        >
          <span>{collapsed ? '展开' : '收起'}</span>
          <ChevronUp
            className="w-3 h-3 transition-transform duration-200"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Dual Pane */}
          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            {/* Input Pane */}
            <div
              className="flex flex-col rounded-lg overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
            >
              <div
                className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--dim)' }}
              >
                <span>中文输入</span>
                <span style={{ color: 'var(--muted)' }}>{input.length} 字</span>
              </div>
              <textarea
                className="flex-1 min-h-16 max-h-48 p-3 text-[13.5px] leading-relaxed resize-none bg-transparent outline-none"
                style={{ color: 'var(--fg)', fontFamily: 'inherit' }}
                placeholder="用中文写一句要粘贴到终端的草稿…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
            </div>

            {/* Output Pane */}
            <div
              className="flex flex-col rounded-lg overflow-hidden"
              style={{ background: 'oklch(15% 0.012 50)', border: '1px solid var(--border-soft)' }}
            >
              <div
                className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--dim)' }}
              >
                <span>英文结果 · 复制后粘贴到终端</span>
                <span style={{ color: 'var(--dim)' }}>⌘C</span>
              </div>
              <div className="flex-1 min-h-16 max-h-48 p-3 text-[13.5px] leading-relaxed overflow-y-auto">
                {status === 'idle' && !result && (
                  <span style={{ color: 'var(--dim)', fontStyle: 'italic' }}>翻译结果会出现在这里…</span>
                )}
                {status === 'translating' && (
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--dim)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    翻译中…
                  </span>
                )}
                {(status === 'done' || status === 'error') && result && (
                  <span style={{ color: status === 'error' ? 'oklch(70% 0.145 40)' : 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {result}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {TONE_CHIPS.map(tone => (
              <button
                key={tone}
                onClick={() => setActiveTone(t => t === tone ? null : tone)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors"
                style={{
                  background: activeTone === tone ? 'var(--accent-soft)' : 'oklch(0% 0 0 / 0.2)',
                  color: activeTone === tone ? 'var(--accent)' : 'var(--muted)',
                  border: `1px solid ${activeTone === tone ? 'oklch(70% 0.145 40 / 0.3)' : 'var(--border-soft)'}`,
                }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor', opacity: 0.6 }} />
                语气 · {tone}
              </button>
            ))}
            {DOMAIN_CHIPS.map(d => (
              <button
                key={d.key}
                onClick={() => setActiveDomain(d.key)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors"
                style={{
                  background: activeDomain === d.key ? 'var(--accent-soft)' : 'oklch(0% 0 0 / 0.2)',
                  color: activeDomain === d.key ? 'var(--accent)' : 'var(--muted)',
                  border: `1px solid ${activeDomain === d.key ? 'oklch(70% 0.145 40 / 0.3)' : 'var(--border-soft)'}`,
                }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor', opacity: 0.6 }} />
                领域 · {d.label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
              <span className="px-2 py-1 rounded" style={{ background: 'oklch(0% 0 0 / 0.25)', border: '1px solid var(--border-soft)' }}>
                ⌘ + Enter 翻译
              </span>
              <span className="px-2 py-1 rounded" style={{ background: 'oklch(0% 0 0 / 0.25)', border: '1px solid var(--border-soft)' }}>
                ⌘ + ⇧ + C 复制
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRetry}
                disabled={status !== 'done'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }}
              >
                <RotateCcw className="w-3 h-3" />
                再试一次
              </button>
              <button
                onClick={handleTranslate}
                disabled={!input.trim() || status === 'translating'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'var(--surface-2)' }}
              >
                <Languages className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                翻译为英文
              </button>
              <button
                onClick={handleCopy}
                disabled={!result || status !== 'done'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: copied ? 'var(--live)' : result && status === 'done' ? 'var(--accent)' : 'var(--surface-2)',
                  color: copied ? 'oklch(15% 0.01 145)' : result && status === 'done' ? 'oklch(18% 0.012 50)' : 'var(--dim)',
                  border: 'none',
                }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制英文'}
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border-soft)', borderStyle: 'dashed' }}>
              <div className="flex items-center justify-between mb-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
                <span>最近翻译 · 点 ↺ 可重发到当前终端</span>
                <button onClick={() => setHistory([])} style={{ color: 'var(--dim)', background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit', letterSpacing: 'inherit' }}>
                  清空
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto] gap-2.5 items-center px-3 py-1.5 rounded text-xs"
                    style={{ background: 'oklch(0% 0 0 / 0.15)', border: '1px solid transparent' }}
                  >
                    <span className="truncate" style={{ color: 'var(--muted)' }}>{h.zh}</span>
                    <span style={{ color: 'var(--dim)' }}>→</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setInput(h.zh); setResult(h.en); setStatus('done'); }}
                        className="p-1 rounded hover:bg-[var(--accent-soft)]"
                        title="回填"
                      >
                        <RotateCcw className="w-3 h-3" style={{ color: 'var(--dim)' }} />
                      </button>
                      <button
                        onClick={async () => {
                          const payload = h.en + `\n\n— translated for ${targetName}`;
                          try { await navigator.clipboard.writeText(payload); } catch {}
                        }}
                        className="p-1 rounded hover:bg-[var(--accent-soft)]"
                        title="复制"
                      >
                        <Copy className="w-3 h-3" style={{ color: 'var(--dim)' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/nmsn/Studio/agent-echo && pnpm build --filter @agentecho/main 2>&1 | head -30`
Expected: No TypeScript errors in ComposeBar.tsx

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/renderer/components/ComposeBar.tsx
git commit -m "refactor: redesign ComposeBar with dual-pane translation"
```

---

## Task 6: App.tsx — New Layout Scaffold

**Files:**
- Modify: `packages/main/src/renderer/App.tsx`

- [ ] **Step 1: Read current App.tsx**

Read `packages/main/src/renderer/App.tsx` in full before modifying.

- [ ] **Step 2: Replace App.tsx**

Replace the entire file content with:

```tsx
import { useState, useEffect } from 'react';
import { useConversationStore } from './stores/conversation';
import { SessionList } from './components/SessionList';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageItem } from './components/MessageItem';
import { ComposeBar } from './components/ComposeBar';
import { Settings, Search } from 'lucide-react';

export function App() {
  const { settings, updateSettings, sessions, fetchSessions, subscribeToEvents } = useConversationStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchSessions();
    const unsubscribe = subscribeToEvents();
    const interval = setInterval(fetchSessions, 5000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchSessions, subscribeToEvents]);

  useEffect(() => {
    if (typeof window.api?.configureTranslation === 'function') {
      window.api.configureTranslation({}).then((config) => {
        if (config.apiKey && !settings.translationEnabled) {
          updateSettings({ translationEnabled: true });
        }
      });
    }
  }, []);

  const handleSettingsChange = (newSettings: typeof settings) => {
    updateSettings(newSettings);
  };

  const handleSpeak = async (content: string) => {
    if (!window.api?.speak) return;
    try {
      const result = await window.api.speak('speak-' + Date.now(), content);
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        await audio.play();
      }
    } catch {}
  };

  const activeSessionId = useConversationStore(s => s.activeSessionId);
  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: 'var(--bg)', minWidth: '1100px' }}
    >
      {/* Left Sidebar — 340px */}
      <aside
        className="w-[340px] shrink-0 flex flex-col"
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border-soft)' }}
      >
        {/* Logo */}
        <div
          className="h-14 flex items-center px-4 gap-3 border-b"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z" />
              <path d="M12 2 L12 22" />
              <path d="M2 8 L22 16" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>Agent Echo</h1>
            <span className="text-xs tracking-widest" style={{ color: 'var(--dim)' }}>监控 · 翻译 · 朗读</span>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 min-h-0">
          <SessionList />
        </div>
      </aside>

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-14 px-5 flex items-center gap-4 border-b shrink-0"
          style={{ background: 'var(--surface-3)', borderColor: 'var(--border-soft)', zIndex: 10 }}
        >
          {/* Status chip (center) */}
          <div className="flex-1 flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{ background: 'oklch(0% 0 0 / 0.25)', border: '1px solid var(--border-soft)', color: 'var(--muted)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--live)', animation: 'pulse 2.4s ease-in-out infinite', boxShadow: '0 0 0 0 oklch(72% 0.155 145 / 0.4)' }}
              />
              <span>{sessions.filter(s => s.status === 'active').length} 个终端在线</span>
            </div>
          </div>

          {/* Right: Search + Settings */}
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--muted)', background: 'transparent' }}
              title="全局搜索"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--muted)', background: 'transparent' }}
              onClick={() => setShowSettings(true)}
              title="设置"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="flex-1 flex flex-col min-h-0" style={{ background: 'var(--bg)' }}>
          <ConversationHeader />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            <div className="flex flex-col gap-4">
              {!activeSession ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p style={{ color: 'var(--dim)' }}>选择左侧会话开始监控</p>
                </div>
              ) : activeSession.messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p style={{ color: 'var(--dim)' }}>暂无消息</p>
                </div>
              ) : (
                activeSession.messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    sessionId={activeSession.id}
                    showTranslation={settings.translationEnabled}
                    onSpeak={handleSpeak}
                  />
                ))
              )}
            </div>
          </div>

          <ComposeBar enabled={settings.translationEnabled} />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div
            className="relative w-[480px] rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>设置</h3>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              {/* Inline SettingsPanel — reuse existing */}
              <SettingsPanelContent settings={settings} onSettingsChange={handleSettingsChange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline settings panel content to avoid circular import issues
import { SettingsPanelContent } from './components/SettingsPanel';
```

**Note:** The SettingsPanel import assumes the existing `SettingsPanel` component exports a `SettingsPanelContent` sub-component or can be imported directly. If not, use the existing `SettingsPanel` component inline.

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/nmsn/Studio/agent-echo && pnpm build --filter @agentecho/main 2>&1 | head -40`
Expected: No TypeScript errors, or errors are clear and fixable

- [ ] **Step 4: Fix any compilation issues**

Common issues:
- `SettingsPanelContent` not exported — import `SettingsPanel` directly instead
- Missing `kind` on Session type — add to `packages/shared/src/index.ts`
- Missing `cleaned` on message — check type definition

Fix each issue and re-run build until clean.

- [ ] **Step 5: Commit**

```bash
git add packages/main/src/renderer/App.tsx
git commit -m "refactor: scaffold new layout with sidebar + conversation"
```

---

## Task 7: Remove Old Components + Verify

**Files:**
- Delete: `packages/main/src/renderer/components/ChatView.tsx` (absorbed into App.tsx)
- Delete: `packages/main/src/renderer/components/TabBar.tsx` (replaced by SessionList)

- [ ] **Step 1: Delete old components**

```bash
rm packages/main/src/renderer/components/ChatView.tsx
rm packages/main/src/renderer/components/TabBar.tsx
```

- [ ] **Step 2: Full build**

Run: `cd /Users/nmsn/Studio/agent-echo && pnpm build 2>&1`
Expected: Clean build, no errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove old ChatView and TabBar, finalize layout refactor"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All sections from spec have corresponding tasks
- [ ] Placeholder scan: No "TBD", "TODO", or vague steps
- [ ] Type consistency: `kind` field added to Session type, `message.kind` used in MessageItem
- [ ] All new components: SessionList, ConversationHeader created
- [ ] All modified components: MessageItem, ComposeBar redesigned
- [ ] Old components removed: ChatView, TabBar deleted
- [ ] Theme applied: oklch variables in index.css
- [ ] Build verified: `pnpm build` passes