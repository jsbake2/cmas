import { create } from "zustand";
import { api, type ProfileId, type ProgressSummary } from "@/api/client";

interface ProgressState {
  /** Server-computed summaries, keyed by profile. */
  byProfile: Partial<Record<ProfileId, ProgressSummary>>;
  loading: Partial<Record<ProfileId, boolean>>;
  /** Fetch (or refresh) a profile's progress from the server. */
  load: (p: ProfileId) => Promise<void>;
  /** Store a summary the server already handed back (e.g. on result submit). */
  set: (p: ProfileId, summary: ProgressSummary) => void;
}

export const useProgressStore = create<ProgressState>((setState, get) => ({
  byProfile: {},
  loading: {},
  load: async (p) => {
    if (get().loading[p]) return;
    setState((s) => ({ loading: { ...s.loading, [p]: true } }));
    try {
      const summary = await api.progress(p);
      setState((s) => ({ byProfile: { ...s.byProfile, [p]: summary } }));
    } catch {
      /* leave any prior summary in place */
    } finally {
      setState((s) => ({ loading: { ...s.loading, [p]: false } }));
    }
  },
  set: (p, summary) =>
    setState((s) => ({ byProfile: { ...s.byProfile, [p]: summary } })),
}));
