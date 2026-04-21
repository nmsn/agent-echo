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
  addMessage: (sessionId: string, message: ConversationMessage) => void;
  setActiveSession: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  sessions: [],
  activeSessionId: null,
  settings: {
    soundEnabled: true,
    bounceEnabled: true,
    translationEnabled: false,
  },
  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
      ),
    })),
  setActiveSession: (id) => set({ activeSessionId: id }),
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
}));