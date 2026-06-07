import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useConversationStore } from '../stores/conversation';

export function TitleBar({ onSettingsClick }: { onSettingsClick?: () => void }) {
  const sessions = useConversationStore(s => s.sessions);

  const handleMinimize = () => window.api?.windowMinimize();
  const handleMaximize = () => window.api?.windowMaximize();
  const handleClose = () => window.api?.windowClose();

  return (
    <header
      className="h-9 grid"
      style={{
        gridTemplateColumns: 'auto 1fr auto',
        background: 'var(--surface-3)',
        borderBottom: '1px solid var(--border-soft)',
        WebkitAppRegion: 'drag',
        zIndex: 10,
      }}
    >
      {/* Traffic Lights */}
      <div
        className="flex items-center gap-2"
        style={{ padding: '0 16px 0 18px', WebkitAppRegion: 'no-drag' }}
      >
        {/* Close */}
        <button
          className="w-3 h-3 rounded-full border cursor-pointer outline-none flex items-center justify-center transition-all"
          style={{
            background: 'oklch(38% 0.008 50)',
            borderColor: 'oklch(0% 0 0 / 0.3)',
            color: 'transparent',
          }}
          onClick={handleClose}
          title="关闭"
        >
          <svg viewBox="0 0 8 8" width="8" height="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5"/>
          </svg>
        </button>

        {/* Minimize */}
        <button
          className="w-3 h-3 rounded-full border cursor-pointer outline-none flex items-center justify-center transition-all"
          style={{
            background: 'oklch(38% 0.008 50)',
            borderColor: 'oklch(0% 0 0 / 0.3)',
            color: 'transparent',
          }}
          onClick={handleMinimize}
          title="最小化"
        >
          <svg viewBox="0 0 8 8" width="8" height="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path d="M1.5 4 L6.5 4"/>
          </svg>
        </button>

        {/* Maximize */}
        <button
          className="w-3 h-3 rounded-full border cursor-pointer outline-none flex items-center justify-center transition-all"
          style={{
            background: 'oklch(38% 0.008 50)',
            borderColor: 'oklch(0% 0 0 / 0.3)',
            color: 'transparent',
          }}
          onClick={handleMaximize}
          title="最大化"
        >
          <svg viewBox="0 0 8 8" width="8" height="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M1.5 1.5 L6.5 1.5 L6.5 6.5 L1.5 6.5 Z"/>
          </svg>
        </button>
      </div>

      {/* Spacer */}
      <div />

      {/* Right controls */}
      <div
        className="flex items-center gap-2 pr-3"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          className="w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-all"
          style={{
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid transparent',
          }}
          onClick={onSettingsClick}
          title="设置"
        >
          <Settings style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <style>{`
        /* Traffic lights hover states */
        .flex.items-center.gap-2:hover .w-3.h-3.rounded-full {
          background: oklch(38% 0.008 50);
          color: oklch(0% 0 0 / 0.65);
        }
        .flex.items-center.gap-2:hover .w-3.h-3.rounded-full:nth-child(1) {
          background: oklch(64% 0.18 25);
          color: oklch(20% 0.04 25);
        }
        .flex.items-center.gap-2:hover .w-3.h-3.rounded-full:nth-child(2) {
          background: oklch(78% 0.15 75);
          color: oklch(20% 0.04 75);
        }
        .flex.items-center.gap-2:hover .w-3.h-3.rounded-full:nth-child(3) {
          background: oklch(68% 0.15 145);
          color: oklch(15% 0.04 145);
        }
        .w-3.h-3.rounded-full:active {
          transform: scale(0.9);
        }
        .w-7.h-7.rounded:hover {
          background: var(--surface-2);
          color: var(--fg);
        }
        .w-7.h-7.rounded:active {
          background: var(--surface);
        }
      `}</style>
    </header>
  );
}
