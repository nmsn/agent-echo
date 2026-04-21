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
  source: 'claude' | 'codex' | string;
  pid: number;
  tty?: string;
  cwd: string;
}