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

  const kind = (message as any).kind || 'progress';
  const kindStyle = KIND_TAG_STYLES[kind] || KIND_TAG_STYLES.progress;
  const kindLabel = KIND_LABELS[kind] || '进度';

  const handleSpeak = () => onSpeak?.(message.content);

  const handleTranslate = async () => {
    if (translationStatus === 'translating') return;
    if (!showTranslation) return;

    const textToTranslate = (message as any).cleaned || message.content;
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
    const payload = text + '\n\n— ' + (message as any).name + ' · ' + formatTime(message.timestamp);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {}
  };

  const ts = formatTime(message.timestamp);

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