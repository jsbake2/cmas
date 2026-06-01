import { useMemo, useRef, useState } from "react";
import type { Item, Passage } from "@/content/schema";
import { splitSentences, normalizeSentence } from "@/lib/sentence";
import { useSessionStore } from "@/store/session";
import { useToolsStore } from "@/store/tools";

interface Props {
  passages: Passage[];
  currentItem: Item;
}

interface ParagraphHL {
  start: number;
  end: number;
  color: string;
}

export default function PassagePanel({ passages, currentItem }: Props) {
  const [activeId, setActiveId] = useState(passages[0]?.id);
  const active = passages.find((p) => p.id === activeId) ?? passages[0];

  return (
    <div className="flex flex-col h-full">
      {passages.length > 1 && (
        <div className="flex border-b border-border bg-paper">
          {passages.map((p) => (
            <button
              key={p.id}
              className="px-4 py-2 text-sm font-ui"
              aria-pressed={p.id === active.id}
              style={
                p.id === active.id
                  ? {
                      borderBottom: "3px solid var(--color-accent)",
                      color: "var(--color-accent)",
                    }
                  : { color: "var(--color-muted)" }
              }
              onClick={() => setActiveId(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-y-auto flex-1 p-6">
        <PassageBody passage={active} currentItem={currentItem} />
      </div>
    </div>
  );
}

function PassageBody({
  passage,
  currentItem,
}: {
  passage: Passage;
  currentItem: Item;
}) {
  const session = useSessionStore();
  const tools = useToolsStore();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const highlights = session.state?.highlights[passage.id] ?? [];
  const isEvidence = currentItem.type === "evidence_select" &&
    currentItem.passageIds.includes(passage.id);
  const evidenceScope = isEvidence ? (currentItem as Extract<Item, { type: "evidence_select" }>).paragraphScope : null;
  const selectedSentences = useMemo(() => {
    if (!isEvidence) return new Set<string>();
    const r = session.state?.responses[currentItem.id];
    return new Set((Array.isArray(r) ? (r as string[]) : []).map(normalizeSentence));
  }, [isEvidence, session.state?.responses, currentItem.id]);

  function handleSentenceClick(text: string) {
    if (!isEvidence) return;
    const cur = (session.state?.responses[currentItem.id] as string[]) ?? [];
    const norm = normalizeSentence(text);
    const had = cur.some((s) => normalizeSentence(s) === norm);
    const next = had
      ? cur.filter((s) => normalizeSentence(s) !== norm)
      : [...cur, text];
    session.setResponse(currentItem.id, next);
  }

  function handleMouseUp() {
    if (tools.mode !== "highlighter") return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const root = containerRef.current;
    if (!root) return;

    // Find which paragraph this selection lies in (must be entirely within one)
    const paraEls = Array.from(root.querySelectorAll<HTMLElement>("[data-para-idx]"));
    let paraIdx = -1;
    let paraEl: HTMLElement | null = null;
    for (const el of paraEls) {
      if (
        el.contains(range.startContainer) &&
        el.contains(range.endContainer)
      ) {
        paraIdx = Number(el.dataset.paraIdx);
        paraEl = el;
        break;
      }
    }
    if (paraIdx < 0 || !paraEl) {
      sel.removeAllRanges();
      return;
    }

    const paraText = passage.paragraphs[paraIdx];
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    // map selected text to char offsets in the original paragraph text
    const start = findOffset(paraEl, range.startContainer, range.startOffset, paraText);
    if (start < 0) {
      sel.removeAllRanges();
      return;
    }
    const end = start + selectedText.length;
    if (end > paraText.length) {
      sel.removeAllRanges();
      return;
    }
    const color = tools.highlightColor;
    session.addHighlight(passage.id, { paraIdx, start, end, color });
    sel.removeAllRanges();
  }

  function findOffset(
    paraEl: HTMLElement,
    node: Node,
    nodeOffset: number,
    paraText: string,
  ): number {
    let chars = 0;
    let found = -1;
    const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT);
    const skipNum = paraEl.querySelector(".para-num");
    while (walker.nextNode()) {
      const tn = walker.currentNode as Text;
      if (skipNum && skipNum.contains(tn)) continue;
      const len = tn.data.length;
      if (tn === node) {
        found = chars + nodeOffset;
        break;
      }
      chars += len;
    }
    if (found < 0) return -1;
    // sanity: the text from `found` for selection length should match
    return found;
  }

  return (
    <div
      ref={containerRef}
      className={
        "passage-text" +
        (tools.mode === "highlighter" ? " highlighter-mode" : "")
      }
      onMouseUp={handleMouseUp}
    >
      <h2 className="font-ui text-xl font-semibold mb-1">{passage.title}</h2>
      <div className="text-xs text-muted font-ui mb-4">
        {passage.kind} · {passage.genre}
      </div>
      {passage.paragraphs.map((text, i) => {
        const allowSentenceSelect =
          isEvidence && (evidenceScope == null || evidenceScope === i + 1);
        const paraHL: ParagraphHL[] = highlights
          .filter((h) => h.paraIdx === i)
          .map((h) => ({ start: h.start, end: h.end, color: h.color }))
          .sort((a, b) => a.start - b.start);

        return (
          <div
            key={i}
            className="passage-paragraph"
            data-para-idx={i}
            data-evidence-scope={allowSentenceSelect ? "true" : undefined}
          >
            {allowSentenceSelect && (
              <div className="evidence-scope-hint" aria-hidden="true">
                <span>👇</span>
                <span>
                  Click a sentence below to choose it
                </span>
              </div>
            )}
            <span className="para-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="flex-1">
              <RenderParagraph
                text={text}
                highlights={paraHL}
                interactiveSentences={allowSentenceSelect}
                selectedSentences={selectedSentences}
                onSentenceClick={handleSentenceClick}
                onHighlightClick={(charIdx) => {
                  session.clearHighlightsAt(passage.id, i, charIdx);
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface RPProps {
  text: string;
  highlights: ParagraphHL[];
  interactiveSentences: boolean;
  selectedSentences: Set<string>;
  onSentenceClick: (text: string) => void;
  onHighlightClick: (charOffsetInParagraph: number) => void;
}

function RenderParagraph({
  text,
  highlights,
  interactiveSentences,
  selectedSentences,
  onSentenceClick,
  onHighlightClick,
}: RPProps) {
  // partition the paragraph by sentence boundaries first, then within each
  // sentence overlay highlight ranges.
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    sentences.push({ text: text.trim(), start: 0, end: text.length });
  }

  return (
    <>
      {sentences.map((sent, si) => {
        const isSel = selectedSentences.has(normalizeSentence(sent.text));
        const sentClass = interactiveSentences
          ? "sentence selectable" + (isSel ? " selected" : "")
          : "sentence";

        // compute the gap between the previous sentence end and this start
        // (preserves whitespace)
        const prevEnd = si === 0 ? 0 : sentences[si - 1].end;
        const gap = text.slice(prevEnd, sent.start);

        // overlay highlights inside this sentence
        const segments = sliceWithHighlights(
          text,
          sent.start,
          sent.end,
          highlights,
        );

        return (
          <span key={si}>
            {gap}
            <span
              className={sentClass}
              onClick={
                interactiveSentences
                  ? () => onSentenceClick(sent.text)
                  : undefined
              }
              role={interactiveSentences ? "button" : undefined}
              tabIndex={interactiveSentences ? 0 : undefined}
              onKeyDown={
                interactiveSentences
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSentenceClick(sent.text);
                      }
                    }
                  : undefined
              }
            >
              {segments.map((seg, sgi) =>
                seg.color ? (
                  <mark
                    key={sgi}
                    className={`hl-${seg.color}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onHighlightClick(seg.startInPara);
                    }}
                    title="Click to remove highlight"
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={sgi}>{seg.text}</span>
                ),
              )}
            </span>
          </span>
        );
      })}
      {/* trailing whitespace, if any */}
      {text.slice(sentences[sentences.length - 1]?.end ?? text.length)}
    </>
  );
}

function sliceWithHighlights(
  full: string,
  segStart: number,
  segEnd: number,
  highlights: ParagraphHL[],
): Array<{ text: string; color: string | null; startInPara: number }> {
  const cuts: number[] = [segStart, segEnd];
  for (const h of highlights) {
    if (h.end <= segStart || h.start >= segEnd) continue;
    cuts.push(Math.max(h.start, segStart), Math.min(h.end, segEnd));
  }
  const uniq = [...new Set(cuts)].sort((a, b) => a - b);
  const out: Array<{ text: string; color: string | null; startInPara: number }> = [];
  for (let i = 0; i + 1 < uniq.length; i++) {
    const a = uniq[i];
    const b = uniq[i + 1];
    if (a === b) continue;
    const hit = highlights.find((h) => h.start <= a && h.end >= b);
    out.push({ text: full.slice(a, b), color: hit?.color ?? null, startInPara: a });
  }
  return out;
}
