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

  const handleSpeak = useCallback((content: string) => {
    // TODO: Implement TTS via IPC to main process
    console.log('TTS requested:', content);
  }, []);

  const processCount = sessions.length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Agent Echo</h1>
        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? '关闭设置' : '设置'}
        </button>
      </header>

      <StatusBar isBridgeRunning={isBridgeRunning} processCount={processCount} />

      {showSettings && (
        <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
      )}

      <main className="app-main">
        <ChatView onSpeak={handleSpeak} />
      </main>
    </div>
  );
}