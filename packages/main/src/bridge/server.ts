import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
import type { SocketMessage, Session, ConversationMessage } from './types';
import { cleanTerminalOutput, stripSystemTags } from '@agentecho/shared';

const HTTP_PORT = 18765;
const HTTP_URL = `http://localhost:${HTTP_PORT}`;

export class BridgeServer extends EventEmitter {
  private server: ReturnType<typeof createServer> | null = null;
  private sessions: Map<string, Session> = new Map();
  private running = false;

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);
      this.server.listen(HTTP_PORT, () => {
        this.running = true;
        console.log(`[BridgeServer] Listening on ${HTTP_URL}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.server?.close();
    this.sessions.clear();
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end();
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const message: SocketMessage = JSON.parse(body);
        this.handleMessage(message);
        res.writeHead(200);
        res.end('OK');
      } catch (err: unknown) {
        console.error('[BridgeServer] JSON parse error:', (err as Error).message);
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  }

  private handleMessage(message: SocketMessage): void {
    const { event, source: rawSource, pid, cwd } = message;
    const source = (rawSource ?? 'claude').trim();

    console.log('[BridgeServer] Received:', event.type, 'source:', source, 'sessionId:', event.sessionId, 'pid:', pid);

    switch (event.type) {
      case 'SessionStart':
        this.handleSessionStart(event, source, pid, undefined, cwd);
        break;
      case 'UserPromptSubmit':
        this.handleUserPrompt(event, source, pid, cwd);
        break;
      case 'SessionEnd':
        this.handleSessionEnd(event, source);
        break;
      case 'Stop':
        this.handleStop(event, source);
        break;
      case 'PostToolUse':
        this.handlePostToolUse(event, source);
        break;
      case 'PostToolUseFailure':
        this.handlePostToolUseFailure(event, source);
        break;
    }
  }

  private handleSessionStart(
    event: SocketMessage['event'],
    source: string,
    pid?: number,
    tty?: string,
    cwd?: string
  ): void {
    const sessionId = event.sessionId || `session_${Date.now()}`;
    const session: Session = {
      id: sessionId,
      source,
      pid,
      tty,
      cwd,
      editor: undefined,
      agentPid: undefined,
      messages: [],
      startedAt: event.timestamp || Date.now(),
      lastActivity: event.timestamp || Date.now(),
      sessionTitle: undefined,
      headless: undefined,
    };
    this.sessions.set(sessionId, session);
    this.emit('session:start', session);
  }

  private createSession(
    sessionId: string | undefined,
    source: string,
    pid?: number,
    tty?: string,
    cwd?: string
  ): Session | undefined {
    if (!sessionId) {
      sessionId = `session_${Date.now()}`;
    }
    const session: Session = {
      id: sessionId,
      source,
      pid,
      tty,
      cwd,
      editor: undefined,
      agentPid: undefined,
      messages: [],
      startedAt: Date.now(),
      lastActivity: Date.now(),
      sessionTitle: undefined,
      headless: undefined,
    };
    this.sessions.set(sessionId, session);
    this.emit('session:start', session);
    return session;
  }

  private handleUserPrompt(event: SocketMessage['event'], source: string, pid?: number, cwd?: string): void {
    const sessionId = event.sessionId;
    let session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) {
      // sessionId was provided but not found — do not fall back to findSession
      // (would mix messages from different Claude Code processes into wrong session)
      return;
    }

    const data = event.data || {};
    const rawContent = (data.text as string) || (data.content as string) || JSON.stringify(data);
    const content = stripSystemTags(rawContent);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[INPUT] session:', session.id);
    console.log('[INPUT]', content);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      cleaned: cleanTerminalOutput(content),
      timestamp: event.timestamp || Date.now(),
    };

    session.messages.push(msg);
    session.lastActivity = event.timestamp || Date.now();
    this.emit('message:user', msg, session);
  }

  private handleSessionEnd(event: SocketMessage['event'], source: string): void {
    const sessionId = event.sessionId;
    let session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) {
      session = this.findSession(source);
    }
    if (!session) {
      session = this.createSession(sessionId, source);
    }
    if (!session) return;

    session.lastActivity = event.timestamp || Date.now();
    this.emit('session:end', session);
  }

  private handleStop(event: SocketMessage['event'], source: string): void {
    const sessionId = event.sessionId;
    let session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) return;

    const data = event.data || {};
    const lastMsg = data.last_assistant_message as string | undefined;

    if (lastMsg && typeof lastMsg === 'string' && lastMsg.trim()) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[OUTPUT] session:', session.id);
      console.log('[OUTPUT]', lastMsg);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const msg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: lastMsg,
        cleaned: cleanTerminalOutput(lastMsg),
        timestamp: event.timestamp || Date.now(),
      };

      session.messages.push(msg);
      session.lastActivity = event.timestamp || Date.now();
      this.emit('message:assistant', msg, session);
    }
  }

  private handlePostToolUse(event: SocketMessage['event'], source: string): void {
    const sessionId = event.sessionId;
    let session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) return;

    const data = event.data || {};
    const content = (data.result as string) || (data.response as string) || '';
    if (!content) return;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[OUTPUT] session:', session.id);
    console.log('[OUTPUT]', content);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      cleaned: cleanTerminalOutput(content),
      timestamp: event.timestamp || Date.now(),
    };

    session.messages.push(msg);
    session.lastActivity = event.timestamp || Date.now();
    this.emit('message:assistant', msg, session);
  }

  private handlePostToolUseFailure(event: SocketMessage['event'], source: string): void {
    const sessionId = event.sessionId;
    let session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) return;

    const data = event.data || {};
    const error = data.error as string || JSON.stringify(data);
    const content = `[Tool Error] ${error}`;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[ERROR] session:', session.id);
    console.log('[ERROR]', content);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      cleaned: cleanTerminalOutput(content),
      timestamp: event.timestamp || Date.now(),
    };

    session.messages.push(msg);
    session.lastActivity = event.timestamp || Date.now();
    this.emit('message:assistant', msg, session);
  }

  private findSession(source: string): Session | undefined {
    const allSessions = Array.from(this.sessions.values());
    const sessions = allSessions
      .filter(s => s.source === source)
      .sort((a, b) => b.lastActivity - a.lastActivity);
    return sessions[0];
  }

  private extractContent(data: Record<string, unknown>): string {
    if (typeof data.content === 'string') return data.content;
    if (typeof data.text === 'string') return data.text;
    return JSON.stringify(data);
  }

  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}
