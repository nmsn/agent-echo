import type { Settings } from '../stores/conversation';
import { useState, useEffect } from 'react';

interface TranslationConfig {
  apiKey: string;
  apiBase: string;
  modelName: string;
}

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [translationConfig, setTranslationConfig] = useState<TranslationConfig>({
    apiKey: '',
    apiBase: 'https://api.minimaxi.com/anthropic',
    modelName: 'MiniMax-M2.7',
  });

  useEffect(() => {
    if (typeof window.api?.configureTranslation === 'function') {
      window.api.configureTranslation({}).then((config) => {
        setTranslationConfig(config);
        if (config.apiKey && !settings.translationEnabled) {
          onSettingsChange({ ...settings, translationEnabled: true });
        }
      });
    }
  }, []);

  const handleTranslationConfigChange = async (config: Partial<TranslationConfig>) => {
    const newConfig = { ...translationConfig, ...config };
    setTranslationConfig(newConfig);
    if (typeof window.api?.configureTranslation === 'function') {
      await window.api.configureTranslation(newConfig);
    }
  };

  return (
    <div className="px-4 py-4 bg-[#1E1E1E] border-b border-[#2A2A2A]">
      <h3 className="text-sm font-semibold text-white mb-3">通知设置</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 text-sm text-[#CCCCCC] cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-[#333] bg-[#262626] accent-indigo-500"
            checked={settings.soundEnabled}
            onChange={(e) => onSettingsChange({ ...settings, soundEnabled: e.target.checked })}
          />
          声音提示
        </label>
        <label className="flex items-center gap-2.5 text-sm text-[#CCCCCC] cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-[#333] bg-[#262626] accent-indigo-500"
            checked={settings.bounceEnabled}
            onChange={(e) => onSettingsChange({ ...settings, bounceEnabled: e.target.checked })}
          />
          菜单栏闪烁
        </label>
      </div>

      <h3 className="text-sm font-semibold text-white mb-3 mt-5">翻译朗读</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 text-sm text-[#CCCCCC] cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-[#333] bg-[#262626] accent-indigo-500"
            checked={settings.translationEnabled}
            onChange={(e) => onSettingsChange({ ...settings, translationEnabled: e.target.checked })}
          />
          启用翻译 + TTS
        </label>
        {settings.translationEnabled && (
          <div className="pl-6 space-y-3 mt-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-1.5">API Key</label>
              <input
                type="password"
                className="w-full px-3 py-2 text-sm border border-[#2A2A2A] rounded-lg bg-[#0D0D0D] text-[#CCCCCC] placeholder:text-[#555555] outline-none focus:border-indigo-500 transition-colors"
                placeholder="输入 MiniMax API Key"
                value={translationConfig.apiKey}
                onChange={(e) => handleTranslationConfigChange({ apiKey: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-1.5">API Base</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border border-[#2A2A2A] rounded-lg bg-[#0D0D0D] text-[#CCCCCC] placeholder:text-[#555555] outline-none focus:border-indigo-500 transition-colors"
                placeholder="https://api.minimax.chat"
                value={translationConfig.apiBase}
                onChange={(e) => handleTranslationConfigChange({ apiBase: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#555555] mb-1.5">模型</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border border-[#2A2A2A] rounded-lg bg-[#0D0D0D] text-[#CCCCCC] placeholder:text-[#555555] outline-none focus:border-indigo-500 transition-colors"
                placeholder="MiniMax-Text-01"
                value={translationConfig.modelName}
                onChange={(e) => handleTranslationConfigChange({ modelName: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}