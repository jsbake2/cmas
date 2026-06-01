import type { Item } from "@/content/schema";
import type { CompletedResult } from "@/api/client";

export interface FinalScore {
  earned: number;
  possible: number;
  /** Number of written items the parent hasn't scored yet. */
  unscored: number;
  /** Total written items in this quiz. */
  totalWritten: number;
}

/**
 * Combine the auto-scored total with the parent's rubric scores for written
 * items. A written item that hasn't been parent-scored yet still counts
 * toward `possible` but contributes 0 to `earned`, and bumps `unscored` so
 * the UI can say "pending parent" instead of pretending the kid lost points.
 */
export function computeFinalScore(
  result: CompletedResult,
  itemsById: Map<string, Item>,
): FinalScore {
  let earned = result.auto.earned;
  let possible = result.auto.possible;
  let unscored = 0;
  let totalWritten = 0;

  for (const itemId of Object.keys(result.auto.byItem)) {
    const it = itemsById.get(itemId);
    if (!it) continue;
    if (it.type !== "short_response" && it.type !== "prose_response") continue;
    totalWritten += 1;
    possible += it.rubricMax;
    const ps = result.parentScores?.[itemId];
    if (typeof ps === "number") {
      earned += ps;
    } else {
      unscored += 1;
    }
  }

  return { earned, possible, unscored, totalWritten };
}

export function fmtScore(s: FinalScore): string {
  const e = Math.round(s.earned * 10) / 10;
  return `${e} / ${s.possible}`;
}
