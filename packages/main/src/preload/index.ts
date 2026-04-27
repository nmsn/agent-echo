import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface Config {
  soundEnabled: boolean
  bounceEnabled: boolean
}

interface Session {
  id: string
  source: string
  pid?: number
  tty?: string
  cwd?: string
  editor?: string
  agentPid?: number
  messages: ConversationMessage[]
  startedAt: number
  lastActivity: number
  sessionTitle?: string
  headless?: boolean
}

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  cleaned?: string
  original?: string
  translated?: string
  timestamp: number
}

type SessionCallback = (session: Session) => void
type MessageCallback = (message: ConversationMessage, sessionId: string) => void

const api = {
  getConfig: (): Promise<Config> => ipcRenderer.invoke('config:get'),
  setConfig: (config: Partial<Config>): Promise<Config> =>
    ipcRenderer.invoke('config:set', config),
  getBridgeStatus: (): Promise<boolean> => ipcRenderer.invoke('bridge:status'),
  getSessions: (): Promise<Session[]> => ipcRenderer.invoke('bridge:sessions'),
  onSessionStart: (callback: SessionCallback) => {
    const listener = (_: Electron.IpcRendererEvent, session: Session) => callback(session)
    ipcRenderer.on('session:start', listener)
    return () => ipcRenderer.removeListener('session:start', listener)
  },
  onSessionEnd: (callback: SessionCallback) => {
    const listener = (_: Electron.IpcRendererEvent, session: Session) => callback(session)
    ipcRenderer.on('session:end', listener)
    return () => ipcRenderer.removeListener('session:end', listener)
  },
  onMessageUser: (callback: MessageCallback) => {
    const listener = (_: Electron.IpcRendererEvent, message: ConversationMessage, sessionId: string) => callback(message, sessionId)
    ipcRenderer.on('message:user', listener)
    return () => ipcRenderer.removeListener('message:user', listener)
  },
  onMessageAssistant: (callback: MessageCallback) => {
    const listener = (_: Electron.IpcRendererEvent, message: ConversationMessage, sessionId: string) => callback(message, sessionId)
    ipcRenderer.on('message:assistant', listener)
    return () => ipcRenderer.removeListener('message:assistant', listener)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
