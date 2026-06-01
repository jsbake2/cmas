import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  type ProfileId,
  type CompletedResult,
  type WritingAnalysis,
} from "@/api/client";
import { useContentStore } from "@/store/content";
import type { Item } from "@/content/schema";
import { computeFinalScore } from "@/lib/finalScore";

export default function ResultDetail() {
  const { profile, resultId } = useParams();
  const p = profile as ProfileId;
  const { content, status, load, itemsById } = useContentStore();
  const [result, setResult] = useState<CompletedResult | null>(null);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    api.results(p).then((list) => {
      const r = list.find((x) => x.id === resultId) ?? null;
      setResult(r);
    });
  }, [p, resultId]);

  const bySkill = useMemo(() => {
    if (!result || status !== "ready") return [];
    const groups = new Map<string, { earned: number; possible: number; n: number; auto: number }>();
    for (const [itemId, sc] of Object.entries(result.auto.byItem)) {
      const it = itemsById.get(itemId);
      if (!it) continue;
      const auto = it.type !== "short_response" && it.type !== "prose_response";
      const key = it.skill;
      const g = groups.get(key) ?? { earned: 0, possible: 0, n: 0, auto: 0 };
      if (auto) {
        g.earned += sc.earned;
        g.possible += sc.possible;
        g.auto += 1;
      }
      g.n += 1;
      groups.set(key, g);
    }
    return [...groups.entries()].map(([skill, g]) => ({ skill, ...g }));
  }, [result, status, itemsById]);

  if (status !== "ready" || !content)
    return <div className="p-6 text-muted">Loading…</div>;
  if (!result)
    return (
      <div className="p-6">
        Result not found.{" "}
        <Link to={`/profile/${p}/results`} className="underline text-accent">
          Back
        </Link>
      </div>
    );

  const quizLabel = result.quizId
    ? `Quiz ${result.quizId}${result.passageTitle ? `: ${result.passageTitle}` : ""}`
    : result.unitId;

  const finalScore = computeFinalScore(result, itemsById);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            to={`/profile/${p}/quizzes`}
            className="text-sm text-accent underline"
          >
            ← Back to quizzes
          </Link>
          <h1 className="font-ui text-2xl font-semibold mt-2">{quizLabel}</h1>
          <p className="text-muted text-sm">
            Submitted {new Date(result.submittedAt).toLocaleString()} ·{" "}
            {p === "olive" ? "Olive" : "Fox"}
          </p>
        </div>
        <Link
          to={`/profile/${p}/quizzes`}
          className="btn btn-primary whitespace-nowrap"
          title="Your scores are saved as you tap them — this just takes you back to the quiz list."
        >
          Save &amp; back to quizzes →
        </Link>
      </header>

      <section
        className="card"
        style={{
          background:
            finalScore.unscored > 0
              ? "rgba(161,98,7,0.10)"
              : "rgba(34,197,94,0.10)",
          borderColor: finalScore.unscored > 0 ? "#a16207" : "#16a34a",
        }}
      >
        <h2 className="font-ui font-semibold mb-2">Score</h2>
        <div className="text-3xl">
          {Math.round(finalScore.earned * 10) / 10} / {finalScore.possible}
        </div>
        <p className="text-sm text-muted mt-1">
          {finalScore.totalWritten > 0 ? (
            <>
              Auto-scored {Math.round(result.auto.earned * 10) / 10} /{" "}
              {result.auto.possible}
              {finalScore.unscored > 0 ? (
                <>
                  {" "}
                  · <strong>{finalScore.unscored}</strong> written item
                  {finalScore.unscored === 1 ? "" : "s"} still need
                  {finalScore.unscored === 1 ? "s" : ""} a parent score below.
                </>
              ) : (
                <> · all written items scored by parent.</>
              )}
            </>
          ) : (
            <>Auto-scored — no written items in this quiz.</>
          )}
        </p>
        {result.quizId && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/profile/${p}/quiz/${result.quizId}`}
              className="btn"
              title="Re-open this quiz with your answers as they were; you can change them and submit again."
            >
              ← Go back and fix answers
            </Link>
            <Link
              to={`/profile/${p}/quiz/${result.quizId}/review`}
              className="btn"
            >
              Re-submit from review
            </Link>
          </div>
        )}
      </section>

      {bySkill.length > 0 && (
        <section className="card">
          <h2 className="font-ui font-semibold mb-3">By skill</h2>
          <ul className="space-y-2">
            {bySkill.map((g) => (
              <li key={g.skill} className="flex items-center justify-between">
                <span>{g.skill}</span>
                <span className="text-sm text-muted">
                  {g.auto > 0
                    ? `${Math.round(g.earned * 10) / 10} / ${g.possible} (${g.auto} auto)`
                    : `${g.n} item${g.n === 1 ? "" : "s"} (parent-scored)`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4" id="per-item">
        <h2 className="font-ui font-semibold">Per item</h2>
        {Object.keys(result.auto.byItem).map((itemId, idx) => {
          const it = itemsById.get(itemId);
          if (!it) return null;
          return (
            <ItemReview
              key={itemId}
              idx={idx + 1}
              profile={p}
              resultId={result.id}
              item={it}
              response={result.responses[itemId]}
              auto={result.auto.byItem[itemId]}
              parentScore={result.parentScores[itemId]}
              aiAnalysis={result.aiAnalyses?.[itemId]}
              onParentScore={async (s) => {
                await api.patchParentScore(p, result.id, itemId, s);
                setResult({
                  ...result,
                  parentScores: { ...result.parentScores, [itemId]: s },
                });
              }}
              onAiAnalysis={(a) =>
                setResult({
                  ...result,
                  aiAnalyses: {
                    ...(result.aiAnalyses ?? {}),
                    [itemId]: a,
                  },
                })
              }
            />
          );
        })}
      </section>

      <footer
        className="card flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-10"
        style={{
          background: "var(--color-paper)",
          borderColor: finalScore.unscored > 0 ? "#a16207" : "#16a34a",
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        }}
      >
        <div>
          <div className="text-xs text-muted font-ui uppercase tracking-wide">
            {quizLabel}
          </div>
          <div className="font-ui text-xl font-semibold">
            Score: {Math.round(finalScore.earned * 10) / 10} /{" "}
            {finalScore.possible}
            {finalScore.unscored > 0 && (
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: "#a16207" }}
              >
                ({finalScore.unscored} written pending)
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/profile/${p}/quizzes`}
          className="btn btn-primary"
        >
          Save &amp; back to quizzes →
        </Link>
      </footer>
    </div>
  );
}

function ItemReview({
  idx,
  profile,
  resultId,
  item,
  response,
  auto,
  parentScore,
  aiAnalysis,
  onParentScore,
  onAiAnalysis,
}: {
  idx: number;
  profile: ProfileId;
  resultId: string;
  item: Item;
  response: unknown;
  auto: { earned: number; possible: number; correct: boolean | "partial" };
  parentScore?: number;
  aiAnalysis?: WritingAnalysis;
  onParentScore: (s: number) => void | Promise<void>;
  onAiAnalysis: (a: WritingAnalysis) => void;
}) {
  const isAuto = item.type !== "short_response" && item.type !== "prose_response";
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-ui font-semibold">
          Item {idx}{" "}
          <span className="text-xs text-muted ml-2">{item.type}</span>
        </div>
        {isAuto && (
          <div
            className={
              "text-sm font-semibold " +
              (auto.correct === true
                ? "text-green-700"
                : auto.correct === "partial"
                  ? "text-amber-700"
                  : "text-red-700")
            }
          >
            {auto.earned} / {auto.possible}{" "}
            {auto.correct === true
              ? "✓"
              : auto.correct === "partial"
                ? "partial"
                : "✗"}
          </div>
        )}
      </div>

      <div className="text-sm mb-2">{getStem(item)}</div>

      <div className="text-sm mb-2">
        <strong>Response:</strong>{" "}
        <span className="text-muted">{stringifyResponse(item, response)}</span>
      </div>

      {isAuto && (
        <div className="text-sm">
          <strong>Correct:</strong>{" "}
          <span className="text-muted">{describeCorrect(item)}</span>
        </div>
      )}

      {"rationale" in item && item.rationale && (
        <div className="text-sm mt-2">
          <strong>Why:</strong>{" "}
          <span className="text-muted">{item.rationale}</span>
        </div>
      )}

      {item.type === "short_response" && (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          <div className="text-sm">
            <strong>Sample answer:</strong>{" "}
            <em className="text-muted">{item.sampleAnswer}</em>
          </div>
          <ParentScorer
            max={item.rubricMax}
            value={parentScore}
            onChange={onParentScore}
          />
          <AiPanel
            profile={profile}
            resultId={resultId}
            itemId={item.id}
            response={response}
            analysis={aiAnalysis}
            onAnalysis={onAiAnalysis}
          />
        </div>
      )}

      {item.type === "prose_response" && (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          {item.rubric.length > 0 && (
            <div className="text-sm">
              <strong>Rubric:</strong>
              <ul className="list-disc pl-5 text-muted">
                {item.rubric.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {item.sampleResponse && (
            <div className="text-sm">
              <strong>Sample response:</strong>{" "}
              <em className="text-muted">{item.sampleResponse}</em>
            </div>
          )}
          <ParentScorer
            max={item.rubricMax}
            value={parentScore}
            onChange={onParentScore}
          />
          <AiPanel
            profile={profile}
            resultId={resultId}
            itemId={item.id}
            response={response}
            analysis={aiAnalysis}
            onAnalysis={onAiAnalysis}
          />
        </div>
      )}
    </div>
  );
}

function AiPanel({
  profile,
  resultId,
  itemId,
  response,
  analysis,
  onAnalysis,
}: {
  profile: ProfileId;
  resultId: string;
  itemId: string;
  response: unknown;
  analysis?: WritingAnalysis;
  onAnalysis: (a: WritingAnalysis) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hasText = typeof response === "string" && response.trim().length > 0;

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const { analysis } = await api.aiAnalyze(profile, resultId, itemId);
      onAnalysis(analysis);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!hasText) return null;

  return (
    <div className="mt-3 border-t border-dashed border-border pt-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="font-ui font-semibold text-sm flex items-center gap-2">
          <span aria-hidden="true">🤖</span>
          <span>Quick AI feedback</span>
          <span className="text-xs text-muted font-normal">
            (preview — not a grade)
          </span>
        </div>
        <button
          className="btn"
          onClick={run}
          disabled={loading}
          title="Runs locally on Qwen via Ollama"
        >
          {loading
            ? "Thinking…"
            : analysis
              ? "Re-run"
              : "Get AI feedback"}
        </button>
      </div>

      {err && (
        <div
          className="text-sm card mb-2"
          style={{
            borderColor: "#dc2626",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          Couldn't reach the AI: {err}
        </div>
      )}

      {analysis && (
        <div className="space-y-2 text-sm">
          <div>
            <strong>Overall:</strong> {analysis.overall}
          </div>
          <div>
            <strong>Did it answer the prompt?</strong>{" "}
            <span
              style={{
                color:
                  analysis.addresses_prompt === "yes"
                    ? "#15803d"
                    : analysis.addresses_prompt === "partial"
                      ? "#a16207"
                      : "#b91c1c",
                fontWeight: 600,
              }}
            >
              {analysis.addresses_prompt}
            </span>
          </div>
          {analysis.spelling.length > 0 && (
            <div>
              <strong>Spelling to check:</strong>
              <ul className="list-disc pl-5">
                {analysis.spelling.map((s, i) => (
                  <li key={i}>
                    <span style={{ textDecoration: "line-through" }}>
                      {s.misspelled}
                    </span>{" "}
                    → <span style={{ fontWeight: 600 }}>{s.suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.grammar.length > 0 && (
            <div>
              <strong>Grammar to check:</strong>
              <ul className="list-disc pl-5">
                {analysis.grammar.map((g, i) => (
                  <li key={i}>
                    {g.issue} <em className="text-muted">({g.where})</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.spelling.length === 0 &&
            analysis.grammar.length === 0 && (
              <div className="text-muted">
                Nothing obvious to flag for spelling or grammar.
              </div>
            )}
          {analysis.next_step && (
            <div>
              <strong>Try next time:</strong> {analysis.next_step}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParentScorer({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number | undefined;
  onChange: (s: number) => void | Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">Parent score:</span>
      {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
        <button
          key={n}
          aria-pressed={value === n}
          className="btn px-3"
          style={
            value === n
              ? {
                  background: "var(--color-accent-soft)",
                  borderColor: "var(--color-accent)",
                }
              : {}
          }
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <span className="text-sm text-muted">/ {max}</span>
    </div>
  );
}

function getStem(item: Item): string {
  if (item.type === "two_part_ebsr") return `Part A: ${item.partA.stem}`;
  return (item as { stem?: string }).stem ?? "";
}

function describeCorrect(item: Item): string {
  switch (item.type) {
    case "multiple_choice":
      return item.options.find((o) => o.id === item.correct)?.text ?? item.correct;
    case "multiple_select":
      return item.correct
        .map((id) => item.options.find((o) => o.id === id)?.text ?? id)
        .join("; ");
    case "two_part_ebsr":
      return `A=${item.partA.correct}, B=${item.partB.correct}`;
    case "evidence_select":
      return item.correct.join(" | ");
    case "order":
      return item.correctOrder
        .map((id) => item.elements.find((e) => e.id === id)?.text ?? id)
        .join(" → ");
    case "inline_dropdown":
      return Object.entries(item.blanks)
        .map(([k, v]) => `${k}=${v.correct}`)
        .join(", ");
    default:
      return "";
  }
}

function stringifyResponse(item: Item, r: unknown): string {
  if (r == null) return "(no answer)";
  switch (item.type) {
    case "multiple_choice":
      return typeof r === "string" ? r : "(no answer)";
    case "multiple_select":
      return Array.isArray(r) ? r.join(", ") : "(no answer)";
    case "two_part_ebsr": {
      const o = r as { partA?: string; partB?: string };
      return `A=${o.partA ?? "—"}, B=${o.partB ?? "—"}`;
    }
    case "evidence_select":
      return Array.isArray(r) ? (r as string[]).join(" | ") : "(no answer)";
    case "order":
      return Array.isArray(r) ? (r as string[]).join(" → ") : "(no answer)";
    case "inline_dropdown":
      return Object.entries(r as Record<string, string>)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
    case "short_response":
    case "prose_response":
      return String(r);
  }
}
