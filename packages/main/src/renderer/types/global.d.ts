interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  cleaned?: string
  original?: string
  translated?: string
  timestamp: number
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

interface Config {
  soundEnabled: boolean
  bounceEnabled: boolean
  translationEnabled?: boolean
}

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

interface ElectronAPI {
  getConfig: () => Promise<Config>
  setConfig: (config: Partial<Config>) => Promise<Config>
  getBridgeStatus: () => Promise<boolean>
  getSessions: () => Promise<Session[]>
  configureTranslation: (config: Partial<TranslationConfig>) => Promise<TranslationConfig>
  translateRequest: (
    messageId: string,
    text: string,
    contentType?: 'translate' | 'explain'
  ) => Promise<{ success: boolean; translated?: string; error?: string }>
  onTranslateResult: (callback: (result: TranslateResult) => void) => () => void
  onTranslateError: (callback: (error: TranslateResult) => void) => () => void
  configureTTS: (config: Partial<TTSConfig>) => Promise<TTSConfig>
  speak: (messageId: string, text: string) => Promise<{ success: boolean; audioData?: string; error?: string }>
  onTTSResult: (callback: (result: TTSResult) => void) => () => void
  onSessionStart: (callback: (session: Session) => void) => () => void
  onSessionEnd: (callback: (session: Session) => void) => () => void
  onMessageUser: (callback: (message: ConversationMessage, sessionId: string) => void) => () => void
  onMessageAssistant: (callback: (message: ConversationMessage, sessionId: string) => void) => () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}