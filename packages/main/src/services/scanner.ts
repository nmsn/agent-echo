import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
  pid: number;
  ppid: number;
  tty: string;
  command: string;
  cwd?: string;
  transcriptPath?: string;
}

export class ProcessScanner {
  private interval: NodeJS.Timeout | null = null;
  private onDiscover: (process: ProcessInfo) => void;
  private onLost: (pid: number) => void;
  private knownPids: Set<number> = new Set();

  constructor(
    onDiscover: (process: ProcessInfo) => void,
    onLost: (pid: number) => void
  ) {
    this.onDiscover = onDiscover;
    this.onLost = onLost;
  }

  start(intervalMs: number = 5000): void {
    this.scan();
    this.interval = setInterval(() => this.scan(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Trigger a scan for Claude processes.
   * Note: getProcessDetails() should be called separately to enrich process info
   * with cwd and transcriptPath if needed.
   */
  async scan(): Promise<void> {
    try {
      const processes = await this.discoverProcesses();
      const currentPids = new Set(processes.map((p) => p.pid));

      for (const proc of processes) {
        if (!this.knownPids.has(proc.pid)) {
          this.knownPids.add(proc.pid);
          this.onDiscover(proc);
        }
      }

      for (const pid of this.knownPids) {
        if (!currentPids.has(pid)) {
          this.knownPids.delete(pid);
          this.onLost(pid);
        }
      }
    } catch (err) {
      console.error('[ProcessScanner] Scan error:', err);
    }
  }

  private async discoverProcesses(): Promise<ProcessInfo[]> {
    const { stdout } = await execAsync(
      'ps -Ao pid=,ppid=,tty=,command= | grep -i claude | grep -v grep',
      { maxBuffer: 1024 * 1024 * 10 }
    );

    const processes: ProcessInfo[] = [];
    const lines = stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      const [pidStr, ppidStr, tty, ...cmdParts] = line.trim().split(/\s+/);
      const pid = parseInt(pidStr, 10);
      const ppid = parseInt(ppidStr, 10);
      const command = cmdParts.join(' ');

      if (isNaN(pid)) continue;

      processes.push({ pid, ppid, tty, command });
    }

    return processes;
  }

  async getProcessDetails(pid: number): Promise<Partial<ProcessInfo>> {
    try {
      const { stdout } = await execAsync(`lsof -p ${pid} -a -d cwd -t 2>/dev/null`);
      const cwd = stdout.trim();

      const transcriptPath = await this.findTranscriptPath(cwd);

      return { cwd, transcriptPath };
    } catch {
      return {};
    }
  }

  private async findTranscriptPath(cwd: string): Promise<string | undefined> {
    if (!cwd) return undefined;

    try {
      const { stdout } = await execAsync(
        `find ${cwd} -name "*.jsonl" -path "*/.claude/projects/*" 2>/dev/null | head -1`
      );
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }
}