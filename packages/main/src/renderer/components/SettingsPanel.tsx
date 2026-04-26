import type { Settings } from '../stores/conversation';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  return (
    <div className="px-4 py-4 bg-card border-b border-border">
      <h3 className="text-sm font-medium text-foreground mb-3">通知设置</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border bg-input checked:bg-primary"
            checked={settings.soundEnabled}
            onChange={(e) => onSettingsChange({ ...settings, soundEnabled: e.target.checked })}
          />
          声音提示
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border bg-input checked:bg-primary"
            checked={settings.bounceEnabled}
            onChange={(e) => onSettingsChange({ ...settings, bounceEnabled: e.target.checked })}
          />
          菜单栏闪烁
        </label>
      </div>

      <h3 className="text-sm font-medium text-foreground mb-3 mt-4">翻译朗读</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border bg-input checked:bg-primary"
            checked={settings.translationEnabled}
            onChange={(e) => onSettingsChange({ ...settings, translationEnabled: e.target.checked })}
          />
          启用翻译 + TTS
        </label>
        {settings.translationEnabled && (
          <p className="text-xs text-muted-foreground pl-6">需要配置 MiniMax API Key</p>
        )}
      </div>
    </div>
  );
}