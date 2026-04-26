import { create } from 'zustand';
import type { Session, ConversationMessage } from '@agentecho/shared';

export interface Settings {
  soundEnabled: boolean;
  bounceEnabled: boolean;
  translationEnabled: boolean;
}

interface ConversationState {
  sessions: Session[];
  activeSessionId: string | null;
  settings: Settings;
  isBridgeRunning: boolean;
  addMessage: (sessionId: string, message: ConversationMessage) => void;
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  fetchSessions: () => Promise<void>;
  setBridgeRunning: (running: boolean) => void;
  subscribeToEvents: () => () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  settings: {
    soundEnabled: true,
    bounceEnabled: true,
    translationEnabled: false,
  },
  isBridgeRunning: false,
  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
      ),
    })),
  addSession: (session) =>
    set((state) => {
      // Don't add duplicate sessions
      if (state.sessions.some((s) => s.id === session.id)) {
        return state;
      }
      return { sessions: [...state.sessions, session] };
    }),
  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      activeSessionId:
        state.activeSessionId === sessionId
          ? state.sessions[0]?.id || null
          : state.activeSessionId,
    })),
  setActiveSession: (id) => set({ activeSessionId: id }),
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  fetchSessions: async () => {
    try {
      const sessions = await window.api.getSessions();
      const isRunning = await window.api.getBridgeStatus();
      set({ sessions, isBridgeRunning: isRunning });
    } catch (err) {
      console.error('[Store] Failed to fetch sessions:', err);
    }
  },
  setBridgeRunning: (running) => set({ isBridgeRunning: running }),
  subscribeToEvents: () => {
    const unsubSessionStart = window.api.onSessionStart((session) => {
      console.log('[Store] Session started:', session.id);
      get().addSession(session);
      // Auto-select if no active session
      if (!get().activeSessionId) {
        get().setActiveSession(session.id);
      }
    });

    const unsubSessionEnd = window.api.onSessionEnd((session) => {
      console.log('[Store] Session ended:', session.id);
      get().removeSession(session.id);
    });

    const unsubMessageUser = window.api.onMessageUser((message, sessionId) => {
      console.log('[Store] User message in session:', sessionId);
      get().addMessage(sessionId, message);
    });

    const unsubMessageAssistant = window.api.onMessageAssistant((message, sessionId) => {
      console.log('[Store] Assistant message in session:', sessionId);
      get().addMessage(sessionId, message);
    });

    return () => {
      unsubSessionStart();
      unsubSessionEnd();
      unsubMessageUser();
      unsubMessageAssistant();
    };
  },
}));