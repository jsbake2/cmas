import { create } from "zustand";
import { api, type ProfileId, type SessionState } from "@/api/client";

interface Highlight {
  paraIdx: number;
  start: number;
  end: number;
  color: string;
}

interface SessionStoreState {
  loaded: boolean;
  profile: ProfileId | null;
  state: SessionState | null;
  saving: boolean;
  saveError: string | null;

  loadFor: (p: ProfileId) => Promise<void>;
  startQuiz: (params: {
    profile: ProfileId;
    formId: string;
    quizId: string;
    unitId: string;
    sectionIdx: number;
    seedResponses?: Record<string, unknown>;
    seedFlags?: Record<string, boolean>;
  }) => void;
  setCurrentIndex: (i: number) => void;
  setResponse: (itemId: string, value: unknown) => void;
  toggleFlag: (itemId: string) => void;
  toggleEliminated: (itemId: string, optionId: string) => void;
  setMasked: (itemId: string, masked: boolean) => void;
  setHighlights: (passageId: string, hl: Highlight[]) => void;
  addHighlight: (passageId: string, h: Highlight) => void;
  clearHighlightsAt: (
    passageId: string,
    paraIdx: number,
    charIdx: number,
  ) => void;
  setNote: (passageId: string, note: string) => void;
  setTimerState: (t: SessionState["timer"]) => void;
  saveNow: () => Promise<void>;
  clear: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => SessionStoreState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { profile, state } = get();
    if (!profile || !state) return;
    try {
      await api.putState(profile, state);
    } catch (e) {
      console.warn("[session] autosave failed", e);
    }
  }, 600);
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  loaded: false,
  profile: null,
  state: null,
  saving: false,
  saveError: null,

  loadFor: async (p) => {
    set({ loaded: false, profile: p, state: null });
    try {
      const s = await api.getState(p);
      set({ state: s, loaded: true });
    } catch (e) {
      console.error("[session] load failed", e);
      set({ loaded: true, saveError: String(e) });
    }
  },

  startQuiz: ({
    profile,
    formId,
    quizId,
    unitId,
    sectionIdx,
    seedResponses,
    seedFlags,
  }) => {
    const fresh: SessionState = {
      profile,
      formId,
      quizId,
      unitId,
      sectionIdx,
      startedAt: Date.now(),
      currentIndex: 0,
      responses: seedResponses ?? {},
      flags: seedFlags ?? {},
      eliminated: {},
      masked: {},
      highlights: {},
      notes: {},
    };
    set({ profile, state: fresh, loaded: true });
    scheduleSave(get);
  },

  setCurrentIndex: (i) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, currentIndex: i } });
    scheduleSave(get);
  },

  setResponse: (itemId, value) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, responses: { ...s.responses, [itemId]: value } } });
    scheduleSave(get);
  },

  toggleFlag: (itemId) => {
    const s = get().state;
    if (!s) return;
    set({
      state: { ...s, flags: { ...s.flags, [itemId]: !s.flags[itemId] } },
    });
    scheduleSave(get);
  },

  toggleEliminated: (itemId, optionId) => {
    const s = get().state;
    if (!s) return;
    const cur = new Set(s.eliminated[itemId] ?? []);
    if (cur.has(optionId)) cur.delete(optionId);
    else cur.add(optionId);
    set({
      state: { ...s, eliminated: { ...s.eliminated, [itemId]: [...cur] } },
    });
    scheduleSave(get);
  },

  setMasked: (itemId, masked) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, masked: { ...s.masked, [itemId]: masked } } });
    scheduleSave(get);
  },

  setHighlights: (passageId, hl) => {
    const s = get().state;
    if (!s) return;
    set({
      state: { ...s, highlights: { ...s.highlights, [passageId]: hl } },
    });
    scheduleSave(get);
  },

  addHighlight: (passageId, h) => {
    const s = get().state;
    if (!s) return;
    const cur = s.highlights[passageId] ?? [];
    set({
      state: {
        ...s,
        highlights: { ...s.highlights, [passageId]: [...cur, h] },
      },
    });
    scheduleSave(get);
  },

  clearHighlightsAt: (passageId, paraIdx, charIdx) => {
    const s = get().state;
    if (!s) return;
    const cur = s.highlights[passageId] ?? [];
    const next = cur.filter(
      (h) => !(h.paraIdx === paraIdx && charIdx >= h.start && charIdx < h.end),
    );
    set({
      state: { ...s, highlights: { ...s.highlights, [passageId]: next } },
    });
    scheduleSave(get);
  },

  setNote: (passageId, note) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, notes: { ...s.notes, [passageId]: note } } });
    scheduleSave(get);
  },

  setTimerState: (t) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, timer: t } });
    scheduleSave(get);
  },

  saveNow: async () => {
    const { profile, state } = get();
    if (!profile || !state) return;
    set({ saving: true, saveError: null });
    try {
      await api.putState(profile, state);
      set({ saving: false });
    } catch (e) {
      set({ saving: false, saveError: String(e) });
    }
  },

  clear: async () => {
    const p = get().profile;
    set({ state: null });
    if (p) {
      try {
        await api.clearState(p);
      } catch (e) {
        console.warn("[session] clear failed", e);
      }
    }
  },
}));
