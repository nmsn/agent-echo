import { execFile } from 'child_process';
import http from 'http';

const MAC_FOCUS_TIMEOUT_MS = 2000;

export async function focusTerminal(
  pid?: number,
  pidChain?: number[],
  editor?: string
): Promise<void> {
  if (editor && pidChain?.length) {
    await focusEditorTab(pidChain);
    return;
  }
  await focusTerminalWindow(pid, pidChain);
}

function focusEditorTab(pidChain: number[]): Promise<void> {
  const body = JSON.stringify({ pids: pidChain });
  return new Promise((resolve) => {
    let completed = false;
    const done = () => {
      if (!completed) {
        completed = true;
        resolve();
      }
    };

    for (let port = 23456; port <= 23460; port++) {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/focus-tab',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 300,
        },
        () => done()
      );
      req.on('error', () => {});
      req.on('timeout', () => req.destroy());
      req.end(body);
    }

    setTimeout(done, 500);
  });
}

function focusTerminalWindow(
  pid?: number,
  pidChain?: number[]
): Promise<void> {
  return new Promise((resolve) => {
    const pidCandidates = [pid, ...(pidChain || [])].filter(
      (p): p is number => !!p && p > 0
    );
    const uniquePids = [...new Set(pidCandidates)].slice(0, 3);

    if (uniquePids.length === 0) {
      resolve();
      return;
    }

    const applePidList = uniquePids.join(', ');
    const script = `
      tell application "System Events"
        repeat with targetPid in {${applePidList}}
          set pidValue to contents of targetPid
          set pList to every process whose unix id is pidValue
          if (count of pList) > 0 then
            set frontmost of item 1 of pList to true
            exit repeat
          end if
        end repeat
      end tell`;

    execFile(
      'osascript',
      ['-e', script],
      { timeout: MAC_FOCUS_TIMEOUT_MS },
      () => resolve()
    );
  });
}
