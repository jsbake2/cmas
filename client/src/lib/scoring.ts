import type { Item } from "@/content/schema";
import { normalizeSentence } from "@/lib/sentence";

export interface ItemScore {
  earned: number;
  possible: number;
  correct: boolean | "partial";
  autoScorable: boolean;
}

export function scoreItem(item: Item, response: unknown): ItemScore {
  switch (item.type) {
    case "multiple_choice": {
      const r = typeof response === "string" ? response : null;
      const correct = r === item.correct;
      return { earned: correct ? 1 : 0, possible: 1, correct, autoScorable: true };
    }
    case "multiple_select": {
      const r = Array.isArray(response) ? (response as string[]) : [];
      const correctSet = new Set(item.correct);
      const chosen = new Set(r);
      const wrong = [...chosen].filter((x) => !correctSet.has(x)).length;
      const right = [...chosen].filter((x) => correctSet.has(x)).length;
      if (wrong === 0 && right === item.correct.length) {
        return { earned: 1, possible: 1, correct: true, autoScorable: true };
      }
      // partial credit: fraction correct, but only when no incorrect picks
      if (wrong === 0 && right > 0) {
        return {
          earned: right / item.correct.length,
          possible: 1,
          correct: "partial",
          autoScorable: true,
        };
      }
      return { earned: 0, possible: 1, correct: false, autoScorable: true };
    }
    case "two_part_ebsr": {
      const r = (response ?? {}) as { partA?: string; partB?: string };
      const a = r.partA === item.partA.correct ? 1 : 0;
      const b = r.partB === item.partB.correct ? 1 : 0;
      const earned = a + b;
      return {
        earned,
        possible: 2,
        correct: earned === 2 ? true : earned === 0 ? false : "partial",
        autoScorable: true,
      };
    }
    case "evidence_select": {
      const r = Array.isArray(response) ? (response as string[]) : [];
      const want = new Set(item.correct.map(normalizeSentence));
      const got = new Set(r.map(normalizeSentence));
      const same =
        want.size === got.size && [...want].every((s) => got.has(s));
      return {
        earned: same ? 1 : 0,
        possible: 1,
        correct: same,
        autoScorable: true,
      };
    }
    case "order": {
      const r = Array.isArray(response) ? (response as string[]) : [];
      const same =
        r.length === item.correctOrder.length &&
        r.every((v, i) => v === item.correctOrder[i]);
      return {
        earned: same ? 1 : 0,
        possible: 1,
        correct: same,
        autoScorable: true,
      };
    }
    case "inline_dropdown": {
      const r = (response ?? {}) as Record<string, string>;
      const ids = Object.keys(item.blanks);
      let right = 0;
      for (const id of ids) {
        if (r[id] === item.blanks[id].correct) right++;
      }
      const same = right === ids.length;
      return {
        earned: right / ids.length,
        possible: 1,
        correct: same ? true : right > 0 ? "partial" : false,
        autoScorable: true,
      };
    }
    case "short_response":
    case "prose_response":
      return {
        earned: 0,
        possible: item.rubricMax,
        correct: false,
        autoScorable: false,
      };
  }
}

export function isItemAnswered(item: Item, response: unknown): boolean {
  if (response == null) return false;
  switch (item.type) {
    case "multiple_choice":
      return typeof response === "string" && response.length > 0;
    case "multiple_select":
    case "evidence_select":
    case "order":
      return Array.isArray(response) && response.length > 0;
    case "two_part_ebsr": {
      const r = response as { partA?: string; partB?: string };
      return !!(r.partA && r.partB);
    }
    case "inline_dropdown": {
      const r = response as Record<string, string>;
      return (
        Object.keys(item.blanks).length > 0 &&
        Object.keys(item.blanks).every((k) => !!r[k])
      );
    }
    case "short_response":
    case "prose_response":
      return typeof response === "string" && response.trim().length > 0;
  }
}
