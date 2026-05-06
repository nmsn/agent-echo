import { useState, useCallback, useEffect } from 'react';
import { useConversationStore } from './stores/conversation';
import { ChatView } from './components/ChatView';
import { ComposeBar } from './components/ComposeBar';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';

export function App() {
  const { settings, updateSettings, sessions, isBridgeRunning, fetchSessions, subscribeToEvents } = useConversationStore();
  const [showSettings, setShowSettings] = useState(false);

  // Subscribe to real-time events and fetch initial sessions
  useEffect(() => {
    fetchSessions();
    const unsubscribe = subscribeToEvents();
    const interval = setInterval(fetchSessions, 5000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchSessions, subscribeToEvents]);

  // Auto-enable translation if API key is configured
  useEffect(() => {
    if (typeof window.api?.configureTranslation === 'function') {
      window.api.configureTranslation({}).then((config) => {
        if (config.apiKey && !settings.translationEnabled) {
          updateSettings({ translationEnabled: true });
        }
      });
    }
  }, []); // run once on mount

  const handleSettingsChange = useCallback(
    (newSettings: typeof settings) => {
      updateSettings(newSettings);
    },
    [updateSettings]
  );

  const handleSpeak = useCallback(async (content: string) => {
    if (!window.api?.speak) {
      console.log('TTS not available');
      return;
    }

    try {
      const messageId = 'speak-' + Date.now();
      const result = await window.api.speak(messageId, content);
      if (result.success && result.audioData) {
        // Play audio using HTML5 Audio element with data URL
        const audio = new Audio(result.audioData);
        await audio.play();
      } else {
        console.error('TTS failed:', result.error);
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  }, []);

  const activeCount = sessions.filter((s) => s.status === 'active').length;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h1 className="text-base font-semibold text-foreground truncate">Agent Echo</h1>
        </div>
        <TabBar />
      </aside>

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <StatusBar isBridgeRunning={isBridgeRunning} activeCount={activeCount} totalCount={sessions.length} />
          <button
            className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? '关闭设置' : '设置'}
          </button>
        </header>

        {showSettings && (
          <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
        )}

        <main className="flex-1 overflow-y-auto">
          <ChatView onSpeak={handleSpeak} />
        </main>

        <ComposeBar enabled={settings.translationEnabled} />
      </div>
    </div>
  );
}
