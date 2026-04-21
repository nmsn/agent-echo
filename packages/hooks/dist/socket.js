import WebSocket from 'ws';
const SOCKET_PATH = '/tmp/agent-echo.sock';
export class BridgeClient {
    ws = null;
    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://unix/${SOCKET_PATH}`);
            this.ws.on('open', () => resolve());
            this.ws.on('error', (err) => reject(err));
        });
    }
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    close() {
        this.ws?.close();
    }
}
