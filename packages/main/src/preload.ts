import { contextBridge, ipcRenderer } from 'electron';

interface Config {
  soundEnabled: boolean;
  bounceEnabled: boolean;
}

interface Session {
  id: string;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
  messages: ConversationMessage[];
  startedAt: number;
  lastActivity: number;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  original?: string;
  translated?: string;
  timestamp: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Config management
  getConfig: (): Promise<Config> => ipcRenderer.invoke('config:get'),
  setConfig: (config: Partial<Config>): Promise<Config> =>
    ipcRenderer.invoke('config:set', config),

  // Bridge server status
  getBridgeStatus: (): Promise<boolean> => ipcRenderer.invoke('bridge:status'),
  getSessions: (): Promise<Session[]> => ipcRenderer.invoke('bridge:sessions'),
});
