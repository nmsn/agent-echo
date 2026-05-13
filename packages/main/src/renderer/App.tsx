import { useState, useEffect } from 'react';
import { useConversationStore } from './stores/conversation';
import { ChatView } from './components/ChatView';
import { ComposeBar } from './components/ComposeBar';
import { SettingsPanel } from './components/SettingsPanel';
import { TabBar } from './components/TabBar';
import { Settings, Plus, X } from 'lucide-react';

export function App() {
  const { settings, updateSettings, sessions, fetchSessions, subscribeToEvents, tokenStats } = useConversationStore();
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
    if (!window.api?.speak) {
      console.log('TTS not available');
      return;
    }

    try {
      const messageId = 'speak-' + Date.now();
      const result = await window.api.speak(messageId, content);
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        await audio.play();
      } else {
        console.error('TTS failed:', result.error);
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const activeCount = sessions.filter((s) => s.status === 'active').length;

  return (
    <div className="h-screen flex bg-[#0D0D0D] overflow-hidden">
      {/* Left Sidebar - 240px fixed */}
      <aside className="w-60 shrink-0 flex flex-col bg-[#1E1E2E] border-r border-[#2A2A3A]">
        {/* Logo */}
        <div className="h-16 border-b border-[#2A2A3A] flex items-center px-5 gap-2.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          <span className="text-base font-semibold text-white tracking-tight">Agent Echo</span>
        </div>
        <TabBar />
      </aside>

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-[#2A2A2A] flex items-center px-6 gap-4 bg-[#1A1A1A]">
          <div className="flex-1 max-w-[320px] h-9 rounded-lg bg-[#262626] border border-[#333] flex items-center px-3 gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#444] shrink-0" />
            <span className="text-sm text-[#555555]">Search anything...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 rounded-lg bg-[#262626] border border-[#333] flex items-center justify-center hover:bg-[#333] transition-colors"
              onClick={() => setShowSettings(true)}
              title="设置"
            >
              <Settings className="w-4 h-4 text-[#888888]" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {/* Content Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Agent Echo</h2>
                <p className="text-sm text-[#555555] mt-0.5">会话监控与翻译助手</p>
              </div>
              <button className="h-9 px-4 bg-indigo-500 rounded-lg text-sm font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />
                新会话
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-[#2A2A3A] mb-3" />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-2">Output Tokens</div>
                <div className="text-[28px] font-bold text-white tracking-tight tabular-nums">{tokenStats.totalOutputTokens.toLocaleString()}</div>
                <div className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-semibold bg-[#052C16] text-green-400">+12.5%</div>
              </div>
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-[#2A2A3A] mb-3" />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-2">Input Tokens</div>
                <div className="text-[28px] font-bold text-white tracking-tight tabular-nums">{tokenStats.totalInputTokens.toLocaleString()}</div>
                <div className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-semibold bg-[#052C16] text-green-400">+8.2%</div>
              </div>
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-[#2A2A3A] mb-3" />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-2">Active Sessions</div>
                <div className="text-[28px] font-bold text-white tracking-tight tabular-nums">{activeCount}</div>
                <div className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-semibold bg-[#2C0B0B] text-red-400">-3.1%</div>
              </div>
              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-[#2A2A3A] mb-3" />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-2">Total Sessions</div>
                <div className="text-[28px] font-bold text-white tracking-tight tabular-nums">{sessions.length}</div>
                <div className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-semibold bg-[#2C0B0B] text-red-400">-2.0%</div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <span className="text-sm font-semibold text-white">会话记录</span>
              </div>
              <div className="p-4">
                <ChatView onSpeak={handleSpeak} />
              </div>
            </div>
          </div>
        </div>

        <ComposeBar enabled={settings.translationEnabled} />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          {/* Modal */}
          <div className="relative w-120 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-base font-semibold text-white">设置</h3>
              <button
                className="w-8 h-8 rounded-lg bg-[#262626] border border-[#333] flex items-center justify-center hover:bg-[#333] transition-colors"
                onClick={() => setShowSettings(false)}
              >
                <X className="w-4 h-4 text-[#888888]" />
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