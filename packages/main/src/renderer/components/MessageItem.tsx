import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Languages } from 'lucide-react';
import type { ConversationMessage } from '@agentecho/shared';

interface MessageItemProps {
  message: ConversationMessage;
  sessionId: string;
  showTranslation: boolean;
  onSpeak?: (content: string) => void;
}

export function MessageItem({ message, sessionId, showTranslation, onSpeak }: MessageItemProps) {
  const isUser = message.role === 'user';
  const shortSessionId = sessionId.length > 8 ? sessionId.slice(0, 8) + '…' : sessionId;
  const showCleaned = !!message.cleaned;
  const [hovered, setHovered] = useState(false);

  const handleSpeak = () => {
    if (onSpeak) {
      onSpeak(message.content);
    }
  };

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] relative ${isUser ? 'order-1' : 'order-1'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="text-[10px] leading-none text-muted-foreground/40 mb-0.5 px-1 select-none">
          {shortSessionId}
        </div>
        <div
          className={`relative px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md'
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
                className="absolute bottom-1 right-1 flex items-center gap-0.5"
              >
                <button
                  className="p-0.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors"
                  onClick={handleSpeak}
                  title="朗读"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
                <button
                  className="p-0.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors"
                  title="翻译"
                >
                  <Languages className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {showCleaned && (
          <div className={`mt-2 px-4 py-2 text-xs leading-relaxed whitespace-pre-wrap wrap-break-word ${
            isUser
              ? 'bg-primary/50 text-primary-foreground/70 rounded-2xl rounded-br-md'
              : 'bg-secondary/50 text-secondary-foreground/70 rounded-2xl rounded-bl-md'
          }`}>
            <div className="mb-1.5 border-t border-border/40" />
            {message.cleaned}
          </div>
        )}
      </div>
    </div>
  );
}