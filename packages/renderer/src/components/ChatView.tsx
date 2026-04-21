import { useConversationStore } from '../stores/conversation';
import { MessageItem } from './MessageItem';

interface ChatViewProps {
  onSpeak?: (content: string) => void;
}

export function ChatView({ onSpeak }: ChatViewProps) {
  const { sessions, activeSessionId, settings } = useConversationStore();
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (!activeSession) {
    return (
      <div className="chat-view chat-view-empty">
        <p>暂无活动会话</p>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <span className="session-source">{activeSession.source}</span>
      </div>
      <div className="message-list">
        {activeSession.messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            showTranslation={settings.translationEnabled}
            onSpeak={onSpeak}
          />
        ))}
      </div>
    </div>
  );
}