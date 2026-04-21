export type HookEventType =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'AssistantMessage'
  | 'SessionEnd';

export interface HookEvent {
  type: HookEventType;
  timestamp: number;
  sessionId?: string;
  data: Record<string, unknown>;
}

export interface SocketMessage {
  event: HookEvent;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
}

export interface Session {
  id: string;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
  messages: ConversationMessage[];
  startedAt: number;
  lastActivity: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  original?: string;
  translated?: string;
  timestamp: number;
}