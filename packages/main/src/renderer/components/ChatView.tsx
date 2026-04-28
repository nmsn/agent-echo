import { useEffect } from 'react';
import { useConversationStore } from '../stores/conversation';
import { MessageItem } from './MessageItem';
import { ComposeBar } from './ComposeBar';

interface ChatViewProps {
  onSpeak?: (content: string) => void;
}

export function ChatView({ onSpeak }: ChatViewProps) {
  const { sessions, activeSessionId, settings, setActiveSession } = useConversationStore();

  // Auto-select first session if none is active
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Set as active session if auto-selected (useEffect to avoid setState during render)
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0 && activeSession) {
      setActiveSession(activeSession.id);
    }
  }, [activeSessionId, sessions.length, activeSession, setActiveSession]);

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">暂无活动会话</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-card">
        <span className="text-sm text-foreground">{activeSession.source}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeSession.messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无消息</p>
        ) : (
          activeSession.messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              sessionId={activeSession.id}
              showTranslation={settings.translationEnabled}
              onSpeak={onSpeak}
            />
          ))
        )}
      </div>
      <ComposeBar enabled={settings.translationEnabled} />
    </div>
  );
}