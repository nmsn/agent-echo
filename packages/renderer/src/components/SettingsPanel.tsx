import type { Settings } from '../stores/conversation';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <h3>通知设置</h3>
      <label>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => onSettingsChange({ ...settings, soundEnabled: e.target.checked })}
        />
        声音提示
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.bounceEnabled}
          onChange={(e) => onSettingsChange({ ...settings, bounceEnabled: e.target.checked })}
        />
        菜单栏闪烁
      </label>

      <h3>翻译朗读</h3>
      <label>
        <input
          type="checkbox"
          checked={settings.translationEnabled}
          onChange={(e) => onSettingsChange({ ...settings, translationEnabled: e.target.checked })}
        />
        启用翻译 + TTS
      </label>
      {settings.translationEnabled && (
        <p className="hint">需要配置 MiniMax API Key</p>
      )}
    </div>
  );
}