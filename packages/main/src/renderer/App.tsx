import { useState, useEffect } from 'react';
import { useConversationStore } from './stores/conversation';
import { SessionList } from './components/SessionList';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageItem } from './components/MessageItem';
import { ComposeBar } from './components/ComposeBar';
import { SettingsPanel } from './components/SettingsPanel';
import { TitleBar } from './components/TitleBar';

export function App() {
  const { settings, updateSettings, sessions, fetchSessions, subscribeToEvents } = useConversationStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchSessions();
    const unsubscribe = subscribeToEvents();
    const interval = setInterval(fetchSessions, 5000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchSessions, subscribeToEvents]);

  useEffect(() => {
    if (typeof window.api?.configureTranslation === 'function') {
      window.api.configureTranslation({}).then((config) => {
        if (config.apiKey && !settings.translationEnabled) {
          updateSettings({ translationEnabled: true });
        }
      });
    }
  }, []);

  const handleSettingsChange = (newSettings: typeof settings) => {
    updateSettings(newSettings);
  };

  const handleSpeak = async (content: string) => {
    if (!window.api?.speak) return;
    try {
      const result = await window.api.speak('speak-' + Date.now(), content);
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        await audio.play();
      }
    } catch {}
  };

  const activeSessionId = useConversationStore(s => s.activeSessionId);
  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '36px 1fr',
        height: '100vh',
        minWidth: '1100px',
        background: 'var(--bg)',
      }}
    >
      {/* Row 1: TitleBar — full width */}
      <TitleBar onSettingsClick={() => setShowSettings(true)} />

      {/* Row 2: Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          minHeight: 0,
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: 'var(--sidebar)',
            borderRight: '1px solid var(--border-soft)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SessionList />
        </aside>

        {/* Conversation */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            background: 'var(--bg)',
          }}
        >
          <ConversationHeader />

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {!activeSession ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: '48px' }}>
                <p style={{ color: 'var(--dim)' }}>选择左侧会话开始监控</p>
              </div>
              ) : activeSession.messages.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: '48px' }}>
                  <p style={{ color: 'var(--dim)' }}>暂无消息</p>
                </div>
              ) : (
                activeSession.messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    sessionId={activeSession.id}
                    showTranslation={settings.translationEnabled}
                    onSpeak={handleSpeak}
                  />
                ))
              )}
            </div>
          </div>

          <ComposeBar enabled={settings.translationEnabled} />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowSettings(false)}
          />
          <div
            style={{
              position: 'relative',
              width: '480px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-2)',
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
