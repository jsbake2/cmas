/**
 * Shared sentence splitter — used by both evidence_select rendering and scoring
 * so they always agree. Conservative; handles common cases without trying to
 * be perfect about every edge case. Treats . ! ? as terminators, with simple
 * abbreviation guards.
 */
const ABBREV = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr",
  "st", "ave", "blvd", "rd", "mt", "ft", "vs",
  "etc", "e.g", "i.e", "u.s",
]);

export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

export function splitSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const n = text.length;
  let i = 0;
  let start = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?") {
      // collapse consecutive terminators (e.g. "?!", "...")
      while (i + 1 < n && /[.!?]/.test(text[i + 1])) i++;

      // abbreviation guard: only if dot, preceded by a word, followed by space + lowercase
      if (ch === ".") {
        const wordMatch = text.slice(start, i).match(/([A-Za-z][\w.]*)$/);
        const wordSeg = wordMatch ? wordMatch[1].replace(/\.$/, "").toLowerCase() : "";
        const nextChar = text[i + 1];
        const charAfterSpace = text[i + 2];
        if (
          wordSeg &&
          ABBREV.has(wordSeg) &&
          nextChar === " " &&
          charAfterSpace &&
          /[a-z]/.test(charAfterSpace)
        ) {
          i++;
          continue;
        }
      }

      // include trailing closing quotes / parens
      let endIdx = i + 1;
      while (endIdx < n && /["”'’\)\]]/.test(text[endIdx])) endIdx++;

      const piece = text.slice(start, endIdx).trim();
      if (piece) {
        const trimStart = start + (text.slice(start, endIdx).length - text.slice(start, endIdx).trimStart().length);
        spans.push({ text: piece, start: trimStart, end: trimStart + piece.length });
      }
      // advance past whitespace
      i = endIdx;
      while (i < n && /\s/.test(text[i])) i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail) {
    const trimStart = start + (text.slice(start).length - text.slice(start).trimStart().length);
    spans.push({ text: tail, start: trimStart, end: trimStart + tail.length });
  }
  return spans;
}

export function normalizeSentence(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
