import { useConversationStore } from '../stores/conversation';

interface StatusBarProps {
  isBridgeRunning: boolean;
  processCount: number;
}

export function StatusBar({ isBridgeRunning, processCount }: StatusBarProps) {
  const { totalInputTokens, totalOutputTokens } = useConversationStore((s) => s.tokenStats);

  const hasTokens = totalInputTokens > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isBridgeRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-secondary-foreground">
          {isBridgeRunning ? 'BridgeServer 运行中' : 'BridgeServer 未运行'}
        </span>
      </div>
      <div className="text-muted-foreground flex items-center gap-3">
        <span>Claude Code 进程: {processCount}</span>
        {hasTokens && (
          <span>
            翻译: 请求 {totalInputTokens.toLocaleString()} · 响应 {totalOutputTokens.toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}
