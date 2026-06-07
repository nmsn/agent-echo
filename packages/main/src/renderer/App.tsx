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
      className="h-screen flex overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Left Sidebar — 340px */}
      <aside
        className="w-[340px] shrink-0 flex flex-col"
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border-soft)' }}
      >
        {/* Logo */}
        <div
          className="h-14 flex items-center px-4 gap-3 border-b"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z" />
              <path d="M12 2 L12 22" />
              <path d="M2 8 L22 16" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>Agent Echo</h1>
            <span className="text-xs tracking-widest" style={{ color: 'var(--dim)' }}>监控 · 翻译 · 朗读</span>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 min-h-0">
          <SessionList />
        </div>
      </aside>

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Title Bar with traffic lights */}
        <TitleBar onSettingsClick={() => setShowSettings(true)} />

        {/* Conversation Area */}
        <div className="flex-1 flex flex-col min-h-0" style={{ background: 'var(--bg)' }}>
          <ConversationHeader />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            <div className="flex flex-col gap-4">
              {!activeSession ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p style={{ color: 'var(--dim)' }}>选择左侧会话开始监控</p>
                </div>
              ) : activeSession.messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div
            className="relative w-[480px] rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>设置</h3>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}