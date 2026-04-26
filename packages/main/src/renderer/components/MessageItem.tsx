import type { ConversationMessage } from '@agentecho/shared';

interface MessageItemProps {
  message: ConversationMessage;
  showTranslation: boolean;
  onSpeak?: (content: string) => void;
}

export function MessageItem({ message, showTranslation, onSpeak }: MessageItemProps) {
  const handleSpeak = () => {
    if (onSpeak) {
      onSpeak(message.content);
    }
  };

  return (
    <div className={`mb-4 p-3 rounded-lg ${message.role === 'user' ? 'bg-primary/10' : 'bg-secondary'}`}>
      <div className="text-sm text-foreground">
        {message.content}
      </div>
      {showTranslation && message.translated && (
        <div className="mt-2 text-sm text-muted-foreground italic">
          {message.translated}
        </div>
      )}
      {showTranslation && onSpeak && (
        <button
          className="mt-2 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          onClick={handleSpeak}
          title="朗读"
        >
          🔊
        </button>
      )}
    </div>
  );
}