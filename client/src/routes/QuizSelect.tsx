import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import { api, type ProfileId, type CompletedResult } from "@/api/client";
import { enumerateQuizzes } from "@/lib/quizzes";
import { computeFinalScore } from "@/lib/finalScore";

const PROFILE_DISPLAY: Record<ProfileId, { name: string; grade: number; formId: string; swatch: string }> = {
  olive: { name: "Olive", grade: 6, formId: "g6-form-a", swatch: "#6d28d9" },
  fox: { name: "Fox", grade: 4, formId: "g4-form-a", swatch: "#ea580c" },
};

export default function QuizSelect() {
  const { profile } = useParams();
  const p = profile as ProfileId;
  const meta = PROFILE_DISPLAY[p];
  const nav = useNavigate();
  const { content, status, load, formsById, passagesById } = useContentStore();
  const { loadFor, state } = useSessionStore();
  const [past, setPast] = useState<CompletedResult[]>([]);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadFor(p);
    refreshPast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  function refreshPast() {
    api.results(p).then(setPast).catch(() => setPast([]));
  }

  const form = content && formsById.get(meta.formId);
  const quizzes = useMemo(
    () => (form ? enumerateQuizzes(form, passagesById) : []),
    [form, passagesById],
  );
  const { itemsById } = useContentStore();

  const completedByQuizId = useMemo(() => {
    const m = new Map<string, CompletedResult>();
    for (const r of past) {
      if (r.quizId) m.set(r.quizId, r);
    }
    return m;
  }, [past]);

  async function resetSingleQuiz(r: CompletedResult, label: string) {
    if (!confirm(`Reset ${label}? Olive can take it again from scratch.`.replace("Olive", meta.name))) return;
    try {
      await api.deleteResult(p, r.id);
      // If our in-progress session is for this quiz, sync local state.
      if (state?.quizId === r.quizId) {
        useSessionStore.setState({ state: null });
      }
      refreshPast();
    } catch (e) {
      alert(`Failed to reset: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (status !== "ready" || !content || !form) {
    return <div className="p-6 text-muted">Loading…</div>;
  }

  async function reset() {
    if (
      !confirm(
        `Reset ALL of ${meta.name}'s progress (in-progress session and every completed quiz)? This cannot be undone.`,
      )
    ) return;
    setResetting(true);
    try {
      await api.resetProfile(p);
      useSessionStore.setState({ state: null });
      refreshPast();
    } finally {
      setResetting(false);
    }
  }

  const resumeOnQuiz = state?.formId === meta.formId
    ? quizzes.find((q) => q.quizId === state.quizId)
    : undefined;

  return (
    <div className="max-w-5xl w-full mx-auto p-6">
      <header className="mb-6 flex flex-wrap items-baseline gap-3 justify-between">
        <div>
          <Link to="/" className="text-sm text-accent underline">
            ← Switch profile
          </Link>
          <h1 className="font-ui text-2xl font-semibold mt-2 flex items-center gap-3">
            <span
              className="inline-flex w-10 h-10 rounded-full items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: meta.swatch }}
              aria-hidden="true"
            >
              {meta.name[0]}
            </span>
            {meta.name} — pick a quiz
          </h1>
          <p className="text-muted text-sm mt-1">
            Grade {meta.grade} · {quizzes.length} quizzes · {completedByQuizId.size} completed
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn" to={`/profile/${p}/settings`}>
            Settings
          </Link>
          <button
            className="btn"
            onClick={reset}
            disabled={resetting}
            title="Wipe in-progress session and all completed quizzes for this profile"
          >
            {resetting ? "Resetting…" : "Reset progress"}
          </button>
        </div>
      </header>

      {resumeOnQuiz && (
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <div className="font-semibold">
              Resume Quiz {resumeOnQuiz.quizN}: {resumeOnQuiz.passage.title}
            </div>
            <div className="text-sm text-muted">
              Item {(state!.currentIndex ?? 0) + 1} of{" "}
              {resumeOnQuiz.itemIds.length}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn"
              onClick={() => {
                if (confirm("Discard in-progress and start over?")) {
                  void useSessionStore.getState().clear();
                }
              }}
            >
              Discard
            </button>
            <button
              className="btn btn-primary"
              onClick={() =>
                nav(`/profile/${p}/quiz/${resumeOnQuiz.quizId}`)
              }
            >
              Resume
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quizzes.map((q) => {
          const done = completedByQuizId.get(q.quizId);
          const isResume = resumeOnQuiz?.quizId === q.quizId;
          const finalScore = done
            ? computeFinalScore(done, itemsById)
            : null;
          return (
            <QuizButton
              key={q.quizId}
              quizN={q.quizN}
              title={q.passage.title}
              itemCount={q.itemIds.length}
              done={done}
              finalScore={finalScore}
              isResume={isResume}
              onReset={
                done
                  ? () =>
                      resetSingleQuiz(
                        done,
                        `Quiz ${q.quizN}: ${q.passage.title}`,
                      )
                  : undefined
              }
              onClick={() => {
                if (done) {
                  nav(`/profile/${p}/results/${done.id}`);
                  return;
                }
                if (!isResume) {
                  useSessionStore.getState().startQuiz({
                    profile: p,
                    formId: meta.formId,
                    quizId: q.quizId,
                    unitId: q.unitId,
                    sectionIdx: q.sectionIdx,
                  });
                }
                nav(`/profile/${p}/quiz/${q.quizId}`);
              }}
            />
          );
        })}
      </div>

      <div className="mt-8 text-sm">
        <Link to={`/profile/${p}/results`} className="text-accent underline">
          See all past results ({past.length})
        </Link>
      </div>
    </div>
  );
}

function QuizButton({
  quizN,
  title,
  itemCount,
  done,
  finalScore,
  isResume,
  onClick,
  onReset,
}: {
  quizN: number;
  title: string;
  itemCount: number;
  done: CompletedResult | undefined;
  finalScore: ReturnType<typeof computeFinalScore> | null;
  isResume: boolean;
  onClick: () => void;
  onReset?: () => void;
}) {
  const isDone = !!done;
  const hasPending = finalScore ? finalScore.unscored > 0 : false;
  const scoreText = finalScore
    ? `${Math.round(finalScore.earned * 10) / 10} / ${finalScore.possible}`
    : null;

  return (
    <button
      onClick={onClick}
      className="card text-left p-4 transition-colors flex flex-col gap-1 min-h-[7rem] relative"
      style={{
        background: isDone
          ? "rgba(34, 197, 94, 0.15)"
          : isResume
            ? "var(--color-accent-soft)"
            : "var(--color-paper)",
        borderColor: isDone
          ? "#16a34a"
          : isResume
            ? "var(--color-accent)"
            : "var(--color-border)",
        cursor: "pointer",
      }}
      aria-label={
        isDone
          ? `Quiz ${quizN}, ${title}, completed, score ${scoreText}${
              hasPending ? `, ${finalScore!.unscored} written items still need a parent score` : ""
            }; opens results`
          : `Quiz ${quizN}, ${title}, ${itemCount} items`
      }
    >
      {onReset && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Reset quiz ${quizN} (${title})`}
          title="Reset this quiz so it can be taken again"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onReset();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              onReset();
            }
          }}
          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded text-xs font-ui font-semibold hover:bg-paper transition-colors"
          style={{
            color: "#15803d",
            background: "rgba(255,255,255,0.5)",
          }}
        >
          ↺
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-ui font-semibold text-base"
          style={{ color: isDone ? "#15803d" : "var(--color-ink)" }}
        >
          Quiz {quizN}
        </span>
        {isDone && scoreText && (
          <span
            className="text-xs font-ui font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              background: hasPending ? "#a16207" : "#16a34a",
              color: "white",
            }}
            aria-hidden="true"
          >
            {scoreText}
          </span>
        )}
        {!isDone && isResume && (
          <span
            className="text-xs font-ui font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-paper)",
            }}
            aria-hidden="true"
          >
            In progress
          </span>
        )}
      </div>
      <div
        className="font-reading text-sm leading-snug"
        style={{ color: isDone ? "#166534" : "var(--color-muted)" }}
      >
        {title}
      </div>
      <div className="mt-auto text-xs text-muted">
        {isDone
          ? hasPending
            ? `${finalScore!.unscored} written item${finalScore!.unscored === 1 ? "" : "s"} pending parent score`
            : "Tap to review"
          : `${itemCount} question${itemCount === 1 ? "" : "s"}`}
      </div>
    </button>
  );
}
