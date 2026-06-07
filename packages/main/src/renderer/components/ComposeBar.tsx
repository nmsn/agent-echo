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