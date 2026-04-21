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
    <div className={`message-item message-${message.role}`}>
      <div className="message-content">
        {message.content}
      </div>
      {showTranslation && message.translated && (
        <div className="message-translation">
          {message.translated}
        </div>
      )}
      {showTranslation && onSpeak && (
        <button
          className="tts-button"
          onClick={handleSpeak}
          title="朗读"
        >
          🔊
        </button>
      )}
    </div>
  );
}