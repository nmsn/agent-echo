import { useState, useCallback, useEffect } from 'react';
import { useConversationStore } from './stores/conversation';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';

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

  const processCount = sessions.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="text-lg font-semibold text-foreground">Agent Echo</h1>
        <button
          className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? '关闭设置' : '设置'}
        </button>
      </header>

      <StatusBar isBridgeRunning={isBridgeRunning} processCount={processCount} />

      {showSettings && (
        <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
      )}

      <main className="flex-1 overflow-hidden">
        <ChatView onSpeak={handleSpeak} />
      </main>
    </div>
  );
}