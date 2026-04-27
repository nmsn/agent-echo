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
  const handleSpeak = () => {
    if (onSpeak) {
      onSpeak(message.content);
    }
  };

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div className="text-[10px] leading-none text-muted-foreground/40 mb-0.5 px-1 select-none">
          {shortSessionId}
        </div>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
        {(showTranslation && message.translated) || (showTranslation && onSpeak) ? (
          <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {showTranslation && message.translated && (
              <span className="text-xs text-muted-foreground italic">{message.translated}</span>
            )}
            {showTranslation && onSpeak && (
              <button
                className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                onClick={handleSpeak}
                title="朗读"
              >
                🔊
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}