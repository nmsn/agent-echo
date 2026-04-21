import WebSocket from 'ws';

const DEFAULT_SOCKET_PATH = '/tmp/agent-echo.sock';

export class BridgeClient {
  private ws: WebSocket | null = null;
  private socketPath: string;

  constructor(socketPath?: string) {
    this.socketPath = socketPath || process.env.AGENT_ECHO_SOCKET || DEFAULT_SOCKET_PATH;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://unix/${this.socketPath}`);

      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));
    });
  }

  send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close(): void {
    this.ws?.close();
  }
}