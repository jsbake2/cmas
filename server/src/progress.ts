/**
 * Authoritative gamification logic. The server is the source of truth for
 * XP / ranks / badges / streak; it recomputes the whole summary from the
 * stored results + content on every write so the numbers can never drift.
 *
 * XP model (see the design handoff): each quiz is worth up to 100 XP, scaled
 * by the fraction of auto-scored points earned. A writing-only quiz (no
 * auto-scored items) awards its full 100 on completion. 12 quizzes => a
 * 1200 XP ceiling for both kids regardless of question count.
 */

export const XP_PER_QUIZ = 100;

export const RANKS = [
  { name: "Word Pup", min: 0 },
  { name: "Page Tracker", min: 250 },
  { name: "Story Scout", min: 500 },
  { name: "Chapter Champ", min: 800 },
  { name: "Reading Legend", min: 1080 },
] as const;

export type Tier = "bronze" | "silver" | "gold";

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  tier: Tier;
}

export const BADGES: BadgeDef[] = [
  { id: "first", name: "First Paw", icon: "\u{1F43E}", desc: "Finish your first quiz", tier: "bronze" },
  { id: "perfect", name: "Bullseye", icon: "\u{1F3AF}", desc: "Get a perfect score", tier: "gold" },
  { id: "streak3", name: "On a Roll", icon: "\u{1F525}", desc: "Practice 3 days in a row", tier: "silver" },
  { id: "streak7", name: "Week Streak", icon: "\u{1F4C5}", desc: "Practice 7 days in a row", tier: "gold" },
  { id: "evidence", name: "Detective", icon: "\u{1F50D}", desc: "Ace an evidence question", tier: "silver" },
  { id: "nomiss", name: "Sharp Reader", icon: "⚡", desc: "Finish with no skipped items", tier: "silver" },
  { id: "ten", name: "Ten Quests", icon: "\u{1F3D5}️", desc: "Complete 10 quizzes", tier: "gold" },
  { id: "legend", name: "Reading Legend", icon: "\u{1F451}", desc: "Reach the top rank", tier: "gold" },
  { id: "w50", name: "Cookie Writer", icon: "\u{1F36A}", desc: "Write 50+ words in a response", tier: "bronze" },
  { id: "w100", name: "Big Bone", icon: "\u{1F9B4}", desc: "Write 100+ words in a response", tier: "silver" },
  { id: "w200", name: "Steak Master", icon: "\u{1F969}", desc: "Write 200+ words in a response", tier: "gold" },
  { id: "fetch", name: "Fetch Champ", icon: "\u{1F3BE}", desc: "Clear 5 science quizzes", tier: "silver" },
  { id: "yarn", name: "Yarn Master", icon: "\u{1F9F6}", desc: "Clear 5 story quizzes", tier: "silver" },
  { id: "fish", name: "Big Catch", icon: "\u{1F41F}", desc: "Ace a multi-select question", tier: "bronze" },
  { id: "mouse", name: "Mouse Hunter", icon: "\u{1F42D}", desc: "Beat a timed quiz", tier: "bronze" },
];

export interface RankInfo {
  rank: string;
  next: string | null;
  level: number;
  /** XP floor of the current rank. */
  rankMin: number;
  /** XP floor of the next rank, or null at the top. */
  nextMin: number | null;
  /** XP still needed to reach the next rank, or 0 at the top. */
  xpToNext: number;
}

export function quizXp(fractionCorrect: number): number {
  const f = Math.max(0, Math.min(1, fractionCorrect));
  return Math.round(f * XP_PER_QUIZ);
}

export function rankFor(xp: number): RankInfo {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].min) idx = i;
  }
  const cur = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  return {
    rank: cur.name,
    next: next?.name ?? null,
    level: idx + 1,
    rankMin: cur.min,
    nextMin: next?.min ?? null,
    xpToNext: next ? Math.max(0, next.min - xp) : 0,
  };
}

// --- minimal shapes we read off the content + results ---
interface ContentItem {
  id: string;
  type: string;
  passageIds?: string[];
}
interface ContentPassage {
  id: string;
  kind: "informational" | "literary";
}
interface ContentShape {
  items: ContentItem[];
  passages: ContentPassage[];
}

interface ByItemScore {
  earned: number;
  possible: number;
  correct: boolean | "partial";
}
export interface StoredResult {
  quizId: string;
  auto: { earned: number; possible: number; byItem: Record<string, ByItemScore> };
  responses?: Record<string, unknown>;
  parentScores?: Record<string, number>;
  meta?: Record<string, unknown>;
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

function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function isAnswered(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

/**
 * Recompute the full progress summary from a profile's stored results.
 * `priorBadges` is the previously persisted earned set — badges are sticky
 * (once earned they stay earned, even if a quiz is later reset).
 */
export function computeProgress(args: {
  results: StoredResult[];
  content: ContentShape;
  totalQuizzes: number;
  streakCount: number;
  lastActiveDate: string | null;
  priorBadges?: string[];
}): ProgressSummary {
  const { results, content, totalQuizzes, streakCount, lastActiveDate } = args;

  const itemsById = new Map(content.items.map((i) => [i.id, i]));
  const passagesById = new Map(content.passages.map((p) => [p.id, p]));

  const bestByQuiz: Record<string, number> = {};
  let scienceQuizzes = 0;
  let storyQuizzes = 0;
  let maxWords = 0;
  let anyPerfect = false;
  let anyEvidenceAce = false;
  let anyMultiselectAce = false;
  let anyNoMiss = false;
  let anyTimed = false;

  for (const r of results) {
    const frac = r.auto.possible > 0 ? r.auto.earned / r.auto.possible : 1;
    const xp = quizXp(frac);
    bestByQuiz[r.quizId] = Math.max(bestByQuiz[r.quizId] ?? 0, xp);

    if (r.auto.possible > 0 && r.auto.earned >= r.auto.possible) anyPerfect = true;

    // genre bucket via the quiz's passage (any item's first passage id)
    const firstItemId = Object.keys(r.auto.byItem)[0];
    const passageId = firstItemId
      ? itemsById.get(firstItemId)?.passageIds?.[0]
      : undefined;
    const kind = passageId ? passagesById.get(passageId)?.kind : undefined;
    if (kind === "informational") scienceQuizzes++;
    else if (kind === "literary") storyQuizzes++;

    // per-item achievement scan
    let missed = false;
    for (const [itemId, sc] of Object.entries(r.auto.byItem)) {
      const it = itemsById.get(itemId);
      if (it?.type === "evidence_select" && sc.correct === true) anyEvidenceAce = true;
      if (it?.type === "multiple_select" && sc.correct === true) anyMultiselectAce = true;
      if (!isAnswered(r.responses?.[itemId])) missed = true;
    }
    if (!missed && Object.keys(r.auto.byItem).length > 0) anyNoMiss = true;

    // word-count badges
    if (r.responses) {
      for (const [itemId, v] of Object.entries(r.responses)) {
        const it = itemsById.get(itemId);
        if ((it?.type === "short_response" || it?.type === "prose_response") && typeof v === "string") {
          maxWords = Math.max(maxWords, wordCount(v));
        }
      }
    }

    if (r.meta && (r.meta as { beatTimer?: boolean }).beatTimer === true) anyTimed = true;
  }

  const totalXp = Object.values(bestByQuiz).reduce((a, b) => a + b, 0);
  const rank = rankFor(totalXp);
  const completedCount = results.length;

  const earned = new Set<string>(args.priorBadges ?? []);
  const award = (id: string, cond: boolean) => {
    if (cond) earned.add(id);
  };
  award("first", completedCount >= 1);
  award("ten", completedCount >= 10);
  award("perfect", anyPerfect);
  award("streak3", streakCount >= 3);
  award("streak7", streakCount >= 7);
  award("evidence", anyEvidenceAce);
  award("fish", anyMultiselectAce);
  award("nomiss", anyNoMiss);
  award("legend", totalXp >= RANKS[RANKS.length - 1].min);
  award("w50", maxWords >= 50);
  award("w100", maxWords >= 100);
  award("w200", maxWords >= 200);
  award("fetch", scienceQuizzes >= 5);
  award("yarn", storyQuizzes >= 5);
  award("mouse", anyTimed);

  // keep badge order stable to the catalog
  const badges = BADGES.filter((b) => earned.has(b.id)).map((b) => b.id);

  return {
    totalXp,
    maxXp: totalQuizzes * XP_PER_QUIZ,
    bestByQuiz,
    completedCount,
    badges,
    streakCount,
    lastActiveDate,
    rank,
  };
}

/** YYYY-MM-DD in the server's local time. */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Advance the streak given the prior streak state and "now". Increment on a
 * new consecutive calendar day, no-op if already counted today, reset to 1 if
 * a day was missed.
 */
export function bumpStreak(
  prior: { streakCount: number; lastActiveDate: string | null },
  now = new Date(),
): { streakCount: number; lastActiveDate: string } {
  const today = todayStr(now);
  if (prior.lastActiveDate === today) {
    return { streakCount: Math.max(1, prior.streakCount), lastActiveDate: today };
  }
  const yesterday = todayStr(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (prior.lastActiveDate === yesterday) {
    return { streakCount: prior.streakCount + 1, lastActiveDate: today };
  }
  return { streakCount: 1, lastActiveDate: today };
}
