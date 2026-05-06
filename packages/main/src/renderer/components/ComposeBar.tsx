import { useState } from 'react';
import { Languages, Copy, Loader2, Check, Terminal } from 'lucide-react';
import { useConversationStore } from '../stores/conversation';

interface ComposeBarProps {
  enabled: boolean;
}

type ComposeStatus = 'idle' | 'translating' | 'done' | 'error';

export function ComposeBar({ enabled }: ComposeBarProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<ComposeStatus>('idle');
  const [copied, setCopied] = useState(false);
  const activeSessionId = useConversationStore((s) => s.activeSessionId);

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
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey && e.key === 'Enter') {
      handleTranslate();
    }
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="relative">
        <textarea
          className="w-full px-3 py-2 pr-24 pb-10 text-sm border border-border rounded-2xl bg-input text-foreground resize-none placeholder:text-muted-foreground"
          rows={2}
          placeholder="输入中文，翻译为英文..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <button
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            onClick={handleTranslate}
            disabled={!input.trim() || status === 'translating'}
            title="翻译"
          >
            {status === 'translating' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
          </button>
          {activeSessionId && (
            <button
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center"
              onClick={() => window.api.focusTerminal(activeSessionId)}
              title="跳转终端"
            >
              <Terminal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {(status === 'done' || status === 'error') && result && (
        <div className="relative mt-2">
          <div className={`px-3 py-2 text-sm rounded-xl whitespace-pre-wrap ${status === 'error' ? 'text-red-500' : 'bg-secondary text-secondary-foreground'}`}>
            {result}
          </div>
          {status === 'done' && (
            <div className="absolute right-1.5 bottom-1.5">
              <button
                className="w-7 h-7 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center"
                onClick={handleCopy}
                title="复制"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
