import { useConversationStore } from '../stores/conversation';

interface StatusBarProps {
  isBridgeRunning: boolean;
  activeCount: number;
  totalCount: number;
}

export function StatusBar({ isBridgeRunning, activeCount, totalCount }: StatusBarProps) {
  const { totalInputTokens, totalOutputTokens } = useConversationStore((s) => s.tokenStats);

  const hasTokens = totalInputTokens > 0;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isBridgeRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-[#CCCCCC]">
          {isBridgeRunning ? 'BridgeServer 运行中' : 'BridgeServer 未运行'}
        </span>
      </div>
      <div className="text-[#555555] flex items-center gap-3 text-sm">
        <span>会话: {activeCount} / {totalCount}</span>
        {hasTokens && (
          <span>
            翻译: 请求 {totalInputTokens.toLocaleString()} · 响应 {totalOutputTokens.toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}