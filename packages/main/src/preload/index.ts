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

interface TranslationConfig {
  apiKey: string
  apiBase: string
  modelName: string
}

interface TranslateResult {
  messageId: string
  translated: string
  error?: string
}

interface TTSConfig {
  apiKey: string
  apiBase: string
  model: string
  voiceId: string
}

interface TTSResult {
  audioData: string
  messageId: string
  error?: string
}

const api = {
  getConfig: (): Promise<Config> => ipcRenderer.invoke('config:get'),
  setConfig: (config: Partial<Config>): Promise<Config> =>
    ipcRenderer.invoke('config:set', config),
  getBridgeStatus: (): Promise<boolean> => ipcRenderer.invoke('bridge:status'),
  getSessions: (): Promise<Session[]> => ipcRenderer.invoke('bridge:sessions'),

  // Translation
  configureTranslation: (config: Partial<TranslationConfig>): Promise<TranslationConfig> =>
    ipcRenderer.invoke('translate:configure', config),
  translateRequest: (
    messageId: string,
    text: string,
    contentType?: 'translate' | 'explain'
  ): Promise<{ success: boolean; translated?: string; error?: string }> =>
    ipcRenderer.invoke('translate:request', messageId, text, contentType),
  onTranslateResult: (callback: (result: TranslateResult) => void) => {
    const listener = (_: Electron.IpcRendererEvent, result: TranslateResult) => callback(result)
    ipcRenderer.on('translate:result', listener)
    return () => ipcRenderer.removeListener('translate:result', listener)
  },
  onTranslateError: (callback: (error: TranslateResult) => void) => {
    const listener = (_: Electron.IpcRendererEvent, error: TranslateResult) => callback(error)
    ipcRenderer.on('translate:error', listener)
    return () => ipcRenderer.removeListener('translate:error', listener)
  },

  // TTS
  configureTTS: (config: Partial<TTSConfig>): Promise<TTSConfig> =>
    ipcRenderer.invoke('tts:configure', config),
  speak: (messageId: string, text: string): Promise<{ success: boolean; audioData?: string; error?: string }> =>
    ipcRenderer.invoke('tts:speak', messageId, text),
  onTTSResult: (callback: (result: TTSResult) => void) => {
    const listener = (_: Electron.IpcRendererEvent, result: TTSResult) => callback(result)
    ipcRenderer.on('tts:result', listener)
    return () => ipcRenderer.removeListener('tts:result', listener)
  },

  // Session events
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
