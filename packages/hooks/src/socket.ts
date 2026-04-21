import WebSocket from 'ws';

const SOCKET_PATH = '/tmp/agent-echo.sock';

export class BridgeClient {
  private ws: WebSocket | null = null;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://unix/${SOCKET_PATH}`);

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