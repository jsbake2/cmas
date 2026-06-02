/**
 * Client-side gamification catalog + pure helpers for rendering the Reading
 * Quest chrome (hub rank panel, trophy room, win celebration).
 *
 * The SERVER is authoritative for what a kid has actually earned — fetch the
 * computed summary via `api.progress()`. These constants/helpers exist only so
 * the UI can render rank tracks, XP bars, and the full badge grid (including
 * unearned ones). Keep RANKS / BADGES in sync with `server/src/progress.ts`.
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
  { id: "first", name: "First Paw", icon: "🐾", desc: "Finish your first quiz", tier: "bronze" },
  { id: "perfect", name: "Bullseye", icon: "🎯", desc: "Get a perfect score", tier: "gold" },
  { id: "streak3", name: "On a Roll", icon: "🔥", desc: "Practice 3 days in a row", tier: "silver" },
  { id: "streak7", name: "Week Streak", icon: "📅", desc: "Practice 7 days in a row", tier: "gold" },
  { id: "evidence", name: "Detective", icon: "🔍", desc: "Ace an evidence question", tier: "silver" },
  { id: "nomiss", name: "Sharp Reader", icon: "⚡", desc: "Finish with no skipped items", tier: "silver" },
  { id: "ten", name: "Ten Quests", icon: "🏕️", desc: "Complete 10 quizzes", tier: "gold" },
  { id: "legend", name: "Reading Legend", icon: "👑", desc: "Reach the top rank", tier: "gold" },
  { id: "w50", name: "Cookie Writer", icon: "🍪", desc: "Write 50+ words in a response", tier: "bronze" },
  { id: "w100", name: "Big Bone", icon: "🦴", desc: "Write 100+ words in a response", tier: "silver" },
  { id: "w200", name: "Steak Master", icon: "🥩", desc: "Write 200+ words in a response", tier: "gold" },
  { id: "fetch", name: "Fetch Champ", icon: "🎾", desc: "Clear 5 science quizzes", tier: "silver" },
  { id: "yarn", name: "Yarn Master", icon: "🧶", desc: "Clear 5 story quizzes", tier: "silver" },
  { id: "fish", name: "Big Catch", icon: "🐟", desc: "Ace a multi-select question", tier: "bronze" },
  { id: "mouse", name: "Mouse Hunter", icon: "🐭", desc: "Beat a timed quiz", tier: "bronze" },
];

export const BADGES_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export interface RankInfo {
  rank: string;
  next: string | null;
  level: number;
  rankMin: number;
  nextMin: number | null;
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

/** Fraction (0..1) of progress through the current rank toward the next. */
export function rankBarFraction(xp: number, info: RankInfo): number {
  if (info.nextMin == null) return 1;
  const span = info.nextMin - info.rankMin;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (xp - info.rankMin) / span));
}
