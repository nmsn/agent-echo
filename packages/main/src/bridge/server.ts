import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Server } from 'net';
import type { SocketMessage, Session, ConversationMessage } from './types.js';

interface BridgeMessage {
  type: string;
  payload: unknown;
}

const SOCKET_PATH = '/tmp/agent-echo.sock';

export class BridgeServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private server: Server | null = null;
  private sessions: Map<string, Session> = new Map();
  private clients: Set<WebSocket> = new Set();
  private running = false;

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = new Server();

      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);

        ws.on('message', (data) => {
          try {
            const message: SocketMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (err) {
            console.error('[BridgeServer] Failed to parse message:', err);
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
        });
      });

      this.server.on('error', reject);
      this.server.listen(SOCKET_PATH, () => {
        this.running = true;
        console.log(`[BridgeServer] Listening on ${SOCKET_PATH}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.wss?.close();
    this.server?.close();
    this.clients.clear();
    this.sessions.clear();
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private handleMessage(message: SocketMessage): void {
    const { event, source, pid, tty, cwd } = message;

    switch (event.type) {
      case 'SessionStart':
        this.handleSessionStart(event, source, pid, tty, cwd);
        break;
      case 'UserPromptSubmit':
        this.handleUserPrompt(event, source);
        break;
      case 'AssistantMessage':
        this.handleAssistantMessage(event, source);
        break;
      case 'SessionEnd':
        this.handleSessionEnd(event, source);
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
      messages: [],
      startedAt: event.timestamp || Date.now(),
      lastActivity: event.timestamp || Date.now(),
    };
    this.sessions.set(sessionId, session);
    this.emit('session:start', session);
    this.broadcast({ type: 'session:start', payload: session });
  }

  private handleUserPrompt(event: SocketMessage['event'], source: string): void {
    const session = this.findSession(source);
    if (!session) {
      console.warn(`[BridgeServer] No session found for source: ${source}`);
      return;
    }

    const content = this.extractContent(event.data);
    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: event.timestamp,
    };

    session.messages.push(msg);
    session.lastActivity = event.timestamp;
    this.emit('message:user', msg, session);
  }

  private handleAssistantMessage(event: SocketMessage['event'], source: string): void {
    const session = this.findSession(source);
    if (!session) {
      console.warn(`[BridgeServer] No session found for source: ${source}`);
      return;
    }

    const content = this.extractContent(event.data);
    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: event.timestamp,
    };

    session.messages.push(msg);
    session.lastActivity = event.timestamp;
    this.emit('message:assistant', msg, session);
    this.broadcast({ type: 'message', payload: msg });
  }

  private handleSessionEnd(event: SocketMessage['event'], source: string): void {
    const session = this.findSession(source);
    if (!session) {
      console.warn(`[BridgeServer] No session found for source: ${source}`);
      return;
    }

    session.lastActivity = event.timestamp;
    this.emit('session:end', session);
    this.broadcast({ type: 'session:end', payload: { id: session.id } });
  }

  private findSession(source: string): Session | undefined {
    const sessions = Array.from(this.sessions.values())
      .filter(s => s.source === source)
      .sort((a, b) => b.lastActivity - a.lastActivity);
    return sessions[0];
  }

  private extractContent(data: Record<string, unknown>): string {
    if (typeof data.content === 'string') return data.content;
    if (typeof data.text === 'string') return data.text;
    return JSON.stringify(data);
  }

  private broadcast(data: BridgeMessage): void {
    const message = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('[BridgeServer] Failed to send message:', err);
        }
      }
    }
  }

  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}