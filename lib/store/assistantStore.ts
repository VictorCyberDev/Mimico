import { create } from "zustand";

/** §5 — shape ported directly from the prototype's logic, minus the fake timers. */
export type Status = "idle" | "listening" | "thinking" | "speaking";
export type Tone = "Casual" | "Professional" | "Custom";
export type Turn = { who: "user" | "concierge"; text: string; ack?: string };

/** Which voice actually produced the last reply, so the UI can say so out loud. */
export type VoiceSource = "cloned" | "preview";

export type AssistantState = {
  status: Status;
  turns: Turn[];
  liveText: string;
  tone: Tone;
  customTone: string;
  micPermission: "unknown" | "granted" | "denied";
  connection: "online" | "reconnecting" | "error";
  historyOpen: boolean;
  textMode: boolean;

  /** Session-only theme override (§4 — deliberately not persisted). */
  theme: "light" | "dark" | null;

  /** Voice-clone state. `voiceNotice` is surfaced in the UI, never console-only. */
  voiceSource: VoiceSource;
  voiceNotice: string | null;
  cloneReady: boolean;

  setStatus: (s: Status) => void;
  pushTurn: (t: Turn) => void;
  setLiveText: (t: string) => void;
  setTone: (t: Tone) => void;
  setCustomTone: (t: string) => void;
  setMicPermission: (p: AssistantState["micPermission"]) => void;
  setConnection: (c: AssistantState["connection"]) => void;
  toggleHistory: (open?: boolean) => void;
  setTextMode: (on: boolean) => void;
  setTheme: (t: "light" | "dark") => void;
  setVoiceSource: (s: VoiceSource, notice?: string | null) => void;
  setCloneReady: (ready: boolean) => void;
  reset: () => void;
};

export const useAssistant = create<AssistantState>((set) => ({
  status: "idle",
  turns: [],
  liveText: "",
  tone: "Casual",
  customTone: "",
  micPermission: "unknown",
  connection: "online",
  historyOpen: false,
  textMode: false,
  theme: null,
  voiceSource: "preview",
  voiceNotice: null,
  cloneReady: false,

  setStatus: (status) => set({ status }),
  pushTurn: (turn) => set((s) => ({ turns: [...s.turns, turn], liveText: "" })),
  setLiveText: (liveText) => set({ liveText }),
  setTone: (tone) => set({ tone }),
  setCustomTone: (customTone) => set({ customTone }),
  setMicPermission: (micPermission) => set({ micPermission }),
  setConnection: (connection) => set({ connection }),
  toggleHistory: (open) => set((s) => ({ historyOpen: open ?? !s.historyOpen })),
  setTextMode: (textMode) => set({ textMode }),
  setTheme: (theme) => set({ theme }),
  setVoiceSource: (voiceSource, voiceNotice = null) => set({ voiceSource, voiceNotice }),
  setCloneReady: (cloneReady) => set({ cloneReady }),
  reset: () => set({ status: "idle", turns: [], liveText: "", historyOpen: false }),
}));
