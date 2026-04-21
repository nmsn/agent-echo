interface StatusBarProps {
  isBridgeRunning: boolean;
  processCount: number;
}

export function StatusBar({ isBridgeRunning, processCount }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className={`status-indicator ${isBridgeRunning ? 'running' : 'stopped'}`}>
        <span className="status-dot" />
        <span className="status-text">
          {isBridgeRunning ? 'BridgeServer 运行中' : 'BridgeServer 未运行'}
        </span>
      </div>
      <div className="process-count">
        <span>Claude Code 进程: {processCount}</span>
      </div>
    </div>
  );
}