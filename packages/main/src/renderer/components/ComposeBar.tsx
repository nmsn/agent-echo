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
    <div className="border-t border-[#2A2A2A] px-4 py-3 flex flex-col gap-2">
      {/* Output Box */}
      <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="h-10 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center px-3.5 gap-2">
          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
        </div>
        <div className="px-4 py-4 min-h-[64px] font-mono text-sm">
          {status === 'idle' && !result && (
            <span className="text-[#6B6B6B]">翻译结果将显示在这里</span>
          )}
          {status === 'translating' && (
            <span className="flex items-center gap-2 text-[#6B6B6B]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              翻译中...
            </span>
          )}
          {(status === 'done' || status === 'error') && result && (
            <div className={status === 'error' ? 'text-red-400' : 'text-[#CCCCCC]'}>
              {status === 'done' && (
                <span className="text-[#6B6B6B] mb-2 block">&#9699; {input}</span>
              )}
              <span className="whitespace-pre-wrap">{result}</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="relative">
          <textarea
            className="w-full px-4 py-3.5 pr-24 text-sm bg-transparent text-[#CCCCCC] resize-none placeholder:text-[#555555] outline-none"
            rows={2}
            placeholder="输入中文，翻译为英文..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            <button
              className="w-8 h-8 rounded-lg bg-[#6366F1] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
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
                className="w-8 h-8 rounded-lg bg-[#262626] text-[#888888] hover:bg-[#333] transition-colors flex items-center justify-center"
                onClick={() => window.api.focusTerminal(activeSessionId)}
                title="跳转终端"
              >
                <Terminal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="border-t border-[#2A2A2A] px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-[#444444]">Enter 发送 · Shift+Enter 换行</span>
          {status === 'done' && result && (
            <button
              className="w-8 h-8 rounded-lg bg-[#262626] text-[#888888] hover:bg-[#333] transition-colors flex items-center justify-center"
              onClick={handleCopy}
              title="复制"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}