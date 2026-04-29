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
      <div className="flex items-start gap-2">
        <textarea
          className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-input text-foreground resize-none placeholder:text-muted-foreground"
          rows={2}
          placeholder="输入中文，翻译为英文..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
          onClick={handleTranslate}
          disabled={!input.trim() || status === 'translating'}
        >
          {status === 'translating' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Languages className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">翻译</span>
        </button>
      </div>

      {status === 'done' && result && (
        <div className="mt-2 flex items-start gap-2">
          <div className="flex-1 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-xl whitespace-pre-wrap">
            {result}
          </div>
          <button
            className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span className="hidden sm:inline">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">复制</span>
              </>
            )}
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-2 px-3 py-2 text-xs text-red-500">{result}</div>
      )}

      {activeSessionId && (
        <div className="mt-2 flex justify-end">
          <button
            className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1"
            onClick={() => window.api.focusTerminal(activeSessionId)}
            title="跳转到对应终端"
          >
            <Terminal className="w-3 h-3" />
            <span className="hidden sm:inline">跳转终端</span>
          </button>
        </div>
      )}
    </div>
  );
}
