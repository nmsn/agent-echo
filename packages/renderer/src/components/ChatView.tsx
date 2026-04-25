import { useConversationStore } from '../stores/conversation';
import { MessageItem } from './MessageItem';

interface ChatViewProps {
  onSpeak?: (content: string) => void;
}

export function ChatView({ onSpeak }: ChatViewProps) {
  const { sessions, activeSessionId, settings, setActiveSession } = useConversationStore();

  // Auto-select first session if none is active
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  if (!activeSession) {
    return (
      <div className="chat-view chat-view-empty">
        <p>暂无活动会话</p>
      </div>
    );
  }

  // Set as active session if auto-selected
  if (!activeSessionId && sessions.length > 0) {
    setActiveSession(activeSession.id);
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <span className="session-source">{activeSession.source}</span>
      </div>
      <div className="message-list">
        {activeSession.messages.length === 0 ? (
          <p className="no-messages">暂无消息</p>
        ) : (
          activeSession.messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              showTranslation={settings.translationEnabled}
              onSpeak={onSpeak}
            />
          ))
        )}
      </div>
    </div>
  );
}