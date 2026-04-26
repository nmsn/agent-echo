interface StatusBarProps {
  isBridgeRunning: boolean;
  processCount: number;
}

export function StatusBar({ isBridgeRunning, processCount }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isBridgeRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-secondary-foreground">
          {isBridgeRunning ? 'BridgeServer 运行中' : 'BridgeServer 未运行'}
        </span>
      </div>
      <div className="text-muted-foreground">
        <span>Claude Code 进程: {processCount}</span>
      </div>
    </div>
  );
}