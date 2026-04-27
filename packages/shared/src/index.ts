export type HookEventType =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'SessionEnd';

export interface HookEvent {
  type: HookEventType;
  timestamp: number;
  sessionId?: string;
  data: Record<string, unknown>;
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
  cleaned?: string;
  original?: string;
  translated?: string;
  timestamp: number;
}

export interface BridgeMessage {
  type: 'message' | 'session:start' | 'session:end';
  payload: ConversationMessage | Session | { id: string };
}

export * from './utils';
