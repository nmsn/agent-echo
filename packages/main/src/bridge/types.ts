export type HookEventType =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'SessionEnd'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Stop'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'Notification'
  | 'Elicitation';

export interface HookEvent {
  type: HookEventType;
  timestamp?: number;
  sessionId?: string;
  data: Record<string, unknown>;
}

export interface SocketMessage {
  event: HookEvent;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
  editor?: string;
  agentPid?: number;
  pidChain?: number[];
  headless?: boolean;
  sessionTitle?: string;
  // message content
  content?: string;
  response?: string;
}

export interface Session {
  id: string;
  source: string;
  pid?: number;
  tty?: string;
  cwd?: string;
  editor?: string;
  agentPid?: number;
  messages: ConversationMessage[];
  startedAt: number;
  lastActivity: number;
  sessionTitle?: string;
  headless?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  original?: string;
  translated?: string;
  timestamp: number;
}