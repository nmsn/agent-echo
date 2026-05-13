import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Languages, Loader2 } from 'lucide-react';
import type { ConversationMessage } from '@agentecho/shared';
import { useConversationStore } from '../stores/conversation';

interface MessageItemProps {
  message: ConversationMessage;
  sessionId: string;
  showTranslation: boolean;
  onSpeak?: (content: string) => void;
}

type TranslationStatus = 'idle' | 'translating' | 'done' | 'error';

export function MessageItem({ message, sessionId, showTranslation, onSpeak }: MessageItemProps) {
  const isUser = message.role === 'user';
  const shortSessionId = sessionId.length > 8 ? sessionId.slice(0, 8) + '…' : sessionId;
  const [hovered, setHovered] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('idle');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [tokenUsage, setTokenUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const addTokenUsage = useConversationStore((s) => s.addTokenUsage);

  const handleSpeak = () => {
    if (onSpeak) {
      onSpeak(message.content);
    }
  };

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

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] relative ${isUser ? 'order-1' : 'order-1'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="text-[10px] leading-none text-[#555555]/40 mb-0.5 px-1 select-none">
          {shortSessionId}
        </div>
        <div
          className={`relative px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
            isUser
              ? 'bg-indigo-500 text-white rounded-2xl'
              : 'bg-[#2A2A3A] text-[#CCCCCC] rounded-2xl rounded-bl-md'
          }`}
        >
          {message.content}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 4, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute -bottom-1 right-1 flex items-center gap-0.5 bg-[#262626] rounded-lg p-0.5"
              >
                <button
                  className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={handleSpeak}
                  title="朗读"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
                {showTranslation && (
                  <button
                    className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={handleTranslate}
                    disabled={translationStatus === 'translating'}
                    title={translationStatus === 'translating' ? '翻译中...' : '翻译'}
                  >
                    {translationStatus === 'translating' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Languages className="w-3 h-3" />
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {showTranslation && translationStatus === 'translating' && (
          <div className={`mt-2 px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap wrap-break-word ${
            isUser
              ? 'bg-indigo-500/20 text-white/70 rounded-2xl'
              : 'bg-[#2A2A3A]/50 text-[#CCCCCC]/70 rounded-2xl rounded-bl-md'
          }`}>
            <div className="mb-1.5 border-t border-white/10" />
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              翻译中...
            </span>
          </div>
        )}
        {showTranslation && translatedText && translationStatus !== 'translating' && (
          <div className={`mt-2 px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap wrap-break-word ${
            isUser
              ? 'bg-indigo-500/20 text-white/70 rounded-2xl'
              : 'bg-[#2A2A3A]/50 text-[#CCCCCC]/70 rounded-2xl rounded-bl-md'
          }`}>
            <div className="mb-1.5 border-t border-white/10" />
            {translatedText}
            {tokenUsage && (
              <div className="mt-1 text-[10px] text-[#555555]/60">
                请求 {tokenUsage.inputTokens} · 响应 {tokenUsage.outputTokens} tokens
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}