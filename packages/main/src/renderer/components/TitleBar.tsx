import { useState } from 'react';
import { Settings, Search } from 'lucide-react';
import { useConversationStore } from '../stores/conversation';

export function TitleBar({ onSettingsClick }: { onSettingsClick?: () => void }) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const sessions = useConversationStore(s => s.sessions);

  const handleMinimize = () => window.api?.windowMinimize();
  const handleMaximize = () => window.api?.windowMaximize();
  const handleClose = () => window.api?.windowClose();

  return (
    <div
      className="h-11 flex items-center shrink-0"
      style={{ background: 'var(--surface-3)', WebkitAppRegion: 'drag' }}
    >
      {/* Traffic Lights */}
      <div
        className="flex items-center gap-2.5 px-3 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Close */}
        <button
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
          style={{ background: hoveredBtn === 'close' ? '#ed6a5e' : '#ff5f57' }}
          onMouseEnter={() => setHoveredBtn('close')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={handleClose}
          title="关闭"
        >
          {hoveredBtn === 'close' && (
            <svg viewBox="0 0 10 10" width="8" height="8">
              <path d="M2 2 L8 8 M8 2 L2 8" stroke="#4a0002" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Minimize */}
        <button
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
          style={{ background: hoveredBtn === 'minimize' ? '#f0c419' : '#febc2e' }}
          onMouseEnter={() => setHoveredBtn('minimize')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={handleMinimize}
          title="最小化"
        >
          {hoveredBtn === 'minimize' && (
            <svg viewBox="0 0 10 10" width="8" height="8">
              <path d="M2 5 L8 5" stroke="#5a4200" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Maximize */}
        <button
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
          style={{ background: hoveredBtn === 'maximize' ? '#5fcf65' : '#28c840' }}
          onMouseEnter={() => setHoveredBtn('maximize')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={handleMaximize}
          title="最大化"
        >
          {hoveredBtn === 'maximize' && (
            <svg viewBox="0 0 10 10" width="8" height="8">
              <path d="M2 8 L2 2 L8 2 L8 8" stroke="#0a4a00" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </button>
      </div>

      {/* Status chip (center) */}
      <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'no-drag' }}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{ background: 'oklch(0% 0 0 / 0.25)', border: '1px solid var(--border-soft)', color: 'var(--muted)' }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--live)', animation: 'pulse 2.4s ease-in-out infinite', boxShadow: '0 0 0 0 oklch(72% 0.155 145 / 0.4)' }}
          />
          <span>{sessions.filter(s => s.status === 'active').length} 个终端在线</span>
        </div>
      </div>

      {/* Right: Search + Settings */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--muted)', background: 'transparent' }}
          title="全局搜索"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--muted)', background: 'transparent' }}
          onClick={onSettingsClick}
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
