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

interface ElectronAPI {
  getConfig: () => Promise<Config>
  setConfig: (config: Partial<Config>) => Promise<Config>
  getBridgeStatus: () => Promise<boolean>
  getSessions: () => Promise<Session[]>
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