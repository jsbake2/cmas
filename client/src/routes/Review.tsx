import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import { useProgressStore } from "@/store/progress";
import { isItemAnswered, scoreItem } from "@/lib/scoring";
import { api, type ProfileId, type CompletedResult } from "@/api/client";
import { enumerateQuizzes } from "@/lib/quizzes";

const FORM_FOR: Record<ProfileId, string> = {
  olive: "g6-form-a",
  fox: "g4-form-a",
};

export default function Review() {
  const { profile, quizId } = useParams();
  const p = profile as ProfileId;
  const nav = useNavigate();
  const { content, status, load, formsById, passagesById, itemsById } =
    useContentStore();
  const session = useSessionStore();
  const setProgress = useProgressStore((s) => s.set);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (session.profile !== p) void session.loadFor(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const formId = FORM_FOR[p];
  const form = content && formsById.get(formId);
  const quiz = useMemo(
    () =>
      form
        ? enumerateQuizzes(form, passagesById).find((q) => q.quizId === quizId)
        : undefined,
    [form, passagesById, quizId],
  );
  const items = useMemo(
    () =>
      quiz?.itemIds
        .map((id) => itemsById.get(id))
        .filter((x): x is NonNullable<typeof x> => !!x) ?? [],
    [quiz, itemsById],
  );

  if (status !== "ready" || !content || !quiz)
    return <div className="p-6 text-muted">Loading…</div>;

  if (!session.state || session.state.quizId !== quiz.quizId) {
    return (
      <div className="p-6">
        No active session for this quiz.{" "}
        <Link
          to={`/profile/${p}/quizzes`}
          className="underline text-accent"
        >
          Back to quizzes
        </Link>
        .
      </div>
    );
  }

  const responses = session.state.responses;
  const flags = session.state.flags;
  const answered = items.filter((it) =>
    isItemAnswered(it, responses[it.id]),
  ).length;
  const flagged = items.filter((it) => !!flags[it.id]).length;

  async function submit() {
    if (!session.state || !quiz) return;
    setSubmitting(true);
    try {
      const byItem: CompletedResult["auto"]["byItem"] = {};
      let earned = 0;
      let possible = 0;
      for (const it of items) {
        const sc = scoreItem(it, responses[it.id]);
        byItem[it.id] = {
          earned: sc.earned,
          possible: sc.possible,
          correct: sc.correct,
        };
        if (sc.autoScorable) {
          earned += sc.earned;
          possible += sc.possible;
        }
      }
      const payload: Omit<CompletedResult, "id"> = {
        profile: p,
        formId,
        quizId: quiz.quizId,
        unitId: quiz.unitId,
        sectionIdx: quiz.sectionIdx,
        passageTitle: quiz.passage.title,
        submittedAt: Date.now(),
        responses,
        flags,
        auto: { earned, possible, byItem },
        parentScores: {},
        meta: {
          highlights: session.state.highlights,
          notes: session.state.notes,
        },
      };
      // Snapshot progress before posting so the celebration can animate XP
      // and detect rank-ups / new badges.
      const before = await api.progress(p).catch(() => null);
      const saved = await api.postResult(p, payload);
      const after = saved.progress ?? before;
      if (after) setProgress(p, after);
      // Keep in-progress state — student may want to edit & re-submit.
      if (after) {
        nav(`/profile/${p}/celebrate/${saved.id}`, {
          state: {
            before,
            after,
            quizN: quiz.quizN,
            title: quiz.passage.title,
            earned,
            possible,
          },
        });
      } else {
        nav(`/profile/${p}/results/${saved.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-4">
        <Link
          to={`/profile/${p}/quiz/${quiz.quizId}`}
          className="text-sm text-accent underline"
        >
          ← Back to the quiz
        </Link>
        <h1 className="font-ui text-2xl font-semibold mt-2">
          Review — Quiz {quiz.quizN}: {quiz.passage.title}
        </h1>
        <p className="text-muted text-sm">
          {answered} of {items.length} answered · {items.length - answered} unanswered ·{" "}
          {flagged} flagged
        </p>
      </header>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mb-6">
        {items.map((it, i) => {
          const ans = isItemAnswered(it, responses[it.id]);
          const flag = !!flags[it.id];
          return (
            <button
              key={it.id}
              onClick={() => {
                session.setCurrentIndex(i);
                nav(`/profile/${p}/quiz/${quiz.quizId}`);
              }}
              className="card text-left hover:bg-accentSoft flex items-center justify-between"
              aria-label={`Go to item ${i + 1}`}
            >
              <span>
                Item {i + 1}
                <span className="ml-2 text-xs text-muted">{it.type}</span>
              </span>
              <span className="text-sm">
                {flag && <span className="text-accent mr-2">⚑</span>}
                <span
                  className={
                    ans ? "text-accent font-semibold" : "text-muted"
                  }
                >
                  {ans ? "Answered" : "Not answered"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-end border-t border-border pt-4">
        <Link
          to={`/profile/${p}/quiz/${quiz.quizId}`}
          className="btn"
        >
          Keep working
        </Link>
        <button
          className="btn btn-primary"
          disabled={submitting}
          onClick={() => {
            if (
              confirm(
                "Submit your answers? You'll see your score and a summary, and you can come back to fix things and submit again.",
              )
            ) {
              void submit();
            }
          }}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
