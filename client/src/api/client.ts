import type { Content } from "@/content/schema";

const json = { "Content-Type": "application/json" } as const;

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${init?.method ?? "GET"} ${url} → ${r.status}`);
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export type ProfileId = "olive" | "fox";

export interface Profile {
  id: ProfileId;
  name: string;
  grade: number;
  formId: string;
}

export interface WritingAnalysis {
  overall: string;
  spelling: Array<{ misspelled: string; suggestion: string }>;
  grammar: Array<{ issue: string; where: string }>;
  addresses_prompt: "yes" | "partial" | "no";
  next_step: string;
}

export interface CompletedResult {
  id: string;
  profile: ProfileId;
  formId: string;
  /** Display ordinal as string ("1".."N"); upsert key with profile. */
  quizId: string;
  /** Underlying unit (kept for traceability; not user-facing). */
  unitId: string;
  sectionIdx: number;
  passageTitle: string;
  submittedAt: number;
  responses: Record<string, unknown>;
  flags: Record<string, boolean>;
  auto: {
    earned: number;
    possible: number;
    byItem: Record<
      string,
      { earned: number; possible: number; correct: boolean | "partial" }
    >;
  };
  parentScores: Record<string, number>;
  aiAnalyses?: Record<string, WritingAnalysis>;
  meta?: Record<string, unknown>;
}

export interface RankInfo {
  rank: string;
  next: string | null;
  level: number;
  rankMin: number;
  nextMin: number | null;
  xpToNext: number;
}

export interface ProgressSummary {
  totalXp: number;
  maxXp: number;
  bestByQuiz: Record<string, number>;
  completedCount: number;
  badges: string[];
  streakCount: number;
  lastActiveDate: string | null;
  rank: RankInfo;
}

export interface SessionState {
  profile: ProfileId;
  formId: string;
  quizId: string;
  unitId: string;
  sectionIdx: number;
  startedAt: number;
  currentIndex: number;
  responses: Record<string, unknown>;
  flags: Record<string, boolean>;
  eliminated: Record<string, string[]>;
  masked: Record<string, boolean>;
  highlights: Record<
    string,
    Array<{ paraIdx: number; start: number; end: number; color: string }>
  >;
  notes: Record<string, string>;
  tutorialSeen?: boolean;
  timer?: { startedAt: number; minutes: number; remainingMs: number | null };
}

export const api = {
  health: () => req<{ ok: true }>("/api/health"),
  content: () => req<Content>("/api/content"),
  profiles: () => req<Profile[]>("/api/profiles"),

  getState: (p: ProfileId) => req<SessionState | null>(`/api/state/${p}`),
  putState: (p: ProfileId, s: SessionState) =>
    req<{ ok: true }>(`/api/state/${p}`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify(s),
    }),
  clearState: (p: ProfileId) =>
    req<{ ok: true }>(`/api/state/${p}`, { method: "DELETE" }),

  results: (p: ProfileId) =>
    req<CompletedResult[]>(`/api/results/${p}`),
  postResult: (p: ProfileId, r: Omit<CompletedResult, "id">) =>
    req<CompletedResult & { progress?: ProgressSummary }>(`/api/results/${p}`, {
      method: "POST",
      headers: json,
      body: JSON.stringify(r),
    }),

  progress: (p: ProfileId) => req<ProgressSummary>(`/api/progress/${p}`),
  allResults: () => req<CompletedResult[]>("/api/results"),
  patchParentScore: (
    p: ProfileId,
    id: string,
    itemId: string,
    score: number,
  ) =>
    req<{ ok: true }>(`/api/results/${p}/${id}/parent-score`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ itemId, score }),
    }),

  /** Wipe in-progress session + all completed results for this profile. */
  resetProfile: (p: ProfileId) =>
    req<{ ok: true; removedResults: number }>(
      `/api/profile/${p}/all-data`,
      { method: "DELETE" },
    ),

  aiAnalyze: (p: ProfileId, resultId: string, itemId: string) =>
    req<{ ok: true; analysis: WritingAnalysis }>(
      `/api/results/${p}/${resultId}/ai-analyze/${itemId}`,
      { method: "POST", headers: json },
    ),

  /** Delete one quiz's result (and any in-progress session for that quiz). */
  deleteResult: (p: ProfileId, resultId: string) =>
    req<{ ok: true }>(`/api/results/${p}/${resultId}`, { method: "DELETE" }),
};
