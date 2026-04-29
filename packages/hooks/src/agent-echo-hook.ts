#!/usr/bin/env node
// Agent Echo - Claude Code Hook Script
// Usage: node agent-echo-hook.js <event_name>
// Reads stdin JSON from Claude Code

import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

const HTTP_URL = 'http://localhost:18765';
const TRANSCRIPT_TAIL_BYTES = 262144; // 256 KB

// Platform config for macOS
const TERMINAL_NAMES_MAC = new Set([
  'terminal', 'iterm2', 'alacritty', 'wezterm-gui', 'kitty',
  'hyper', 'tabby', 'warp', 'ghostty',
]);

const SYSTEM_BOUNDARY_MAC = new Set(['launchd', 'init', 'systemd']);

const EDITOR_MAP_MAC: Record<string, string> = {
  'code': 'code',
  'cursor': 'cursor',
};

const EDITOR_PATH_CHECKS: [string, string][] = [
  ['visual studio code', 'code'],
  ['cursor.app', 'cursor'],
];

const AGENT_NAMES_MAC = new Set(['claude']);

function agentCmdlineCheck(cmd: string): boolean {
  return cmd.includes('claude-code') || cmd.includes('@anthropic-ai');
}

interface ProcessTreeResult {
  stablePid: number | null;
  agentPid: number | null;
  detectedEditor: string | null;
  pidChain: number[];
}

function createPidResolver(startPid: number): () => ProcessTreeResult {
  let cached: ProcessTreeResult | null = null;

  return function resolve(): ProcessTreeResult {
    if (cached) return cached;

    let pid = startPid;
    let lastGoodPid = pid;
    let terminalPid: number | null = null;
    let detectedEditor: string | null = null;
    let agentPid: number | null = null;
    const pidChain: number[] = [];
    const maxDepth = 8;

    for (let i = 0; i < maxDepth; i++) {
      let name: string;
      let parentPid: number;

      try {
        const ppidOut = execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)], {
          encoding: 'utf8',
          timeout: 1000,
        }).trim();
        const commOut = execFileSync('ps', ['-o', 'comm=', '-p', String(pid)], {
          encoding: 'utf8',
          timeout: 1000,
        }).trim();

        name = path.basename(commOut).toLowerCase();

        if (!detectedEditor) {
          const fullLower = commOut.toLowerCase();
          for (const [pattern, editor] of EDITOR_PATH_CHECKS) {
            if (fullLower.includes(pattern)) {
              detectedEditor = editor;
              break;
            }
          }
        }

        parentPid = parseInt(ppidOut, 10);
      } catch {
        break;
      }

      pidChain.push(pid);

      if (!detectedEditor && EDITOR_MAP_MAC[name]) {
        detectedEditor = EDITOR_MAP_MAC[name];
      }

      // Agent process detection
      if (!agentPid) {
        if (AGENT_NAMES_MAC.has(name)) {
          agentPid = pid;
        } else if (name === 'node') {
          try {
            const cmdOut = execFileSync('ps', ['-o', 'command=', '-p', String(pid)], {
              encoding: 'utf8',
              timeout: 500,
            });
            if (agentCmdlineCheck(cmdOut)) {
              agentPid = pid;
            }
          } catch {
            // ignore
          }
        }
      }

      if (SYSTEM_BOUNDARY_MAC.has(name)) break;
      if (TERMINAL_NAMES_MAC.has(name)) terminalPid = pid;
      lastGoodPid = pid;

      if (!parentPid || parentPid === pid || parentPid <= 1) break;
      pid = parentPid;
    }

    cached = {
      stablePid: terminalPid || lastGoodPid,
      agentPid,
      detectedEditor,
      pidChain,
    };

    return cached;
  };
}

function readStdinJson(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let done = false;
    let timer: NodeJS.Timeout | null = null;

    const onData = (c: Buffer) => chunks.push(c);

    function finish() {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      process.stdin.off('data', onData);
      process.stdin.off('end', finish);

      let payload: Record<string, unknown> = {};
      try {
        const raw = Buffer.concat(chunks).toString();
        if (raw.trim()) payload = JSON.parse(raw);
      } catch {
        // ignore parse errors
      }
      resolve(payload);
    }

    process.stdin.on('data', onData);
    process.stdin.on('end', finish);
    timer = setTimeout(finish, 400);
  });
}

function extractSessionTitleFromTranscript(transcriptPath: string): string | null {
  if (!transcriptPath) return null;

  let data: string;
  let truncated = false;
  let fd: number | null = null;

  try {
    const stat = fs.statSync(transcriptPath);
    fd = fs.openSync(transcriptPath, 'r');
    const readLen = Math.min(stat.size, TRANSCRIPT_TAIL_BYTES);
    truncated = stat.size > readLen;
    const buf = Buffer.alloc(readLen);
    fs.readSync(fd, buf, 0, readLen, Math.max(0, stat.size - readLen));
    data = buf.toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }

  const lines = data.split('\n');
  if (truncated && lines.length > 1) lines.shift();

  let latest: string | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!obj || typeof obj !== 'object') continue;

    const type = typeof obj.type === 'string' ? obj.type : '';
    if (type !== 'custom-title' && type !== 'agent-name') continue;

    const title = (obj.customTitle || obj.title || obj.custom_title ||
                  obj.agentName || obj.agent_name) as string | null;
    if (title) {
      latest = title.length > 80 ? title.slice(0, 79) + '…' : title;
    }
  }
  return latest;
}

interface HookEvent {
  type: string;
  timestamp?: number;
  sessionId?: string;
  data: Record<string, unknown>;
}

interface SocketMessage {
  event: HookEvent;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
  editor?: string;
  agentPid?: number;
  pidChain?: number[];
  headless?: boolean;
  sessionTitle?: string;
  content?: string;
  response?: string;
}

function sendHttpRequest(data: SocketMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);

    const req = http.request(HTTP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      // Consume response
      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', (err) => {
      // Fail silently - don't block Claude Code
      console.error('[agent-echo-hook] Failed to send:', err.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  const eventName = process.argv[2] || 'unknown';

  console.log('[agent-echo-hook] === HOOK START ===');
  console.log('[agent-echo-hook] Event:', eventName);
  console.log('[agent-echo-hook] PID:', process.pid, 'PPID:', process.ppid);
  console.log('[agent-echo-hook] CWD:', process.cwd());
  console.log('[agent-echo-hook] Stdin available:', !process.stdin.isPaused());

  // Pre-resolve process tree info at SessionStart
  const resolve = createPidResolver(process.ppid);
  if (eventName === 'SessionStart') {
    resolve();
  }

  const payload = await readStdinJson();

  console.log('[agent-echo-hook] === STDIN PARSED ===');
  console.log('[agent-echo-hook] Payload keys:', Object.keys(payload));
  console.log('[agent-echo-hook] Payload.source:', payload.source);
  console.log('[agent-echo-hook] Payload.reason:', payload.reason);
  console.log('[agent-echo-hook] Payload.type:', payload.type);
  console.log('[agent-echo-hook] Payload.hook_event_name:', payload.hook_event_name);

  // Build socket message - use argv event name, or payload.hook_event_name, or payload.type, or fall back
  const eventTypeFromPayload = (payload.hook_event_name || payload.type) as string | undefined;
  const finalEventName = (!eventName || eventName === 'unknown') && eventTypeFromPayload
    ? eventTypeFromPayload
    : (eventName || eventTypeFromPayload || 'unknown');
  const message: SocketMessage = {
    event: {
      type: finalEventName,
      timestamp: (payload.timestamp as number) || Date.now(),
      sessionId: (payload.session_id as string) || `${(payload.source as string) || 'claude'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      data: payload,
    },
    source: (payload.source as string) || (payload.reason as string) || 'claude',
    pid: process.ppid,
    cwd: process.cwd(),
  };

  console.log('[agent-echo-hook] === MESSAGE BUILT ===');
  console.log('[agent-echo-hook] source:', message.source);
  console.log('[agent-echo-hook] pid:', message.pid);
  console.log('[agent-echo-hook] event.type:', message.event.type);
  console.log('[agent-echo-hook] eventName (argv):', eventName);

  // Add process tree info if not remote
  if (!process.env.AGENT_ECHO_REMOTE) {
    const { stablePid, agentPid, detectedEditor, pidChain } = resolve();
    console.log('[agent-echo-hook] Process tree resolved:', { stablePid, agentPid, detectedEditor });
    message.pid = stablePid || process.ppid;
    message.editor = detectedEditor || undefined;
    message.agentPid = agentPid || undefined;
    message.pidChain = pidChain.length ? pidChain : undefined;

    // Use stablePid (terminal PID) to distinguish sessions from different terminals
    // Falls back to pid if stablePid is not available
    if (stablePid) {
      message.source = `${message.source}@${stablePid}`;
    }

    // Check headless mode
    if (agentPid) {
      try {
        const cmdOut = execFileSync(`ps -o command= -p ${agentPid}`, {
          encoding: 'utf8',
          timeout: 500,
        });
        if (/\s(-p|--print)(\s|$)/.test(cmdOut)) {
          message.headless = true;
        }
      } catch {
        // ignore
      }
    }
  }

  // Extract session title from transcript
  const transcriptPath = payload.transcript_path as string;
  if (transcriptPath) {
    const title = extractSessionTitleFromTranscript(transcriptPath);
    if (title) message.sessionTitle = title;
    console.log('[agent-echo-hook] Transcript path:', transcriptPath, '-> title:', title);
  }

  // Extract message content based on event type
  if (finalEventName === 'UserPromptSubmit') {
    const text = (payload.text || payload.prompt || payload.content) as string;
    message.content = text;
    // Also put in event.data for server to extract (use 'text' key)
    message.event.data = { ...message.event.data, text, prompt: text };
    console.log('[agent-echo-hook] UserPromptSubmit content:', text?.substring(0, 50));
  }

  // Send via HTTP (wait for completion to ensure delivery)
  console.log('[agent-echo-hook] === SENDING TO BRIDGE ===');
  console.log('[agent-echo-hook] Target URL:', HTTP_URL);
  console.log('[agent-echo-hook] Message:', JSON.stringify(message).substring(0, 200));

  try {
    await sendHttpRequest(message);
    console.log('[agent-echo-hook] Send SUCCESS');
  } catch (err) {
    console.error('[agent-echo-hook] Send FAILED:', err);
  }

  console.log('[agent-echo-hook] === HOOK END ===');
  process.exit(0);
}

main();
