import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import { useAdminStore } from "@/store/admin";
import { useProgressStore } from "@/store/progress";
import { api, type ProfileId, type CompletedResult } from "@/api/client";
import { enumerateQuizzes } from "@/lib/quizzes";
import {
  genreGlyph,
  genreLabel,
  rankBarPct,
  starsForFraction,
} from "@/lib/progress";
import AppBar from "@/components/AppBar";
import AdminBar from "@/components/AdminBar";
import { Stars } from "@/components/GameBits";
import { Avatar, Moose } from "@/components/Avatar";

const PROFILE_DISPLAY: Record<
  ProfileId,
  { name: string; grade: number; formId: string; klass: string }
> = {
  olive: { name: "Olive", grade: 6, formId: "g6-form-a", klass: "player-olive" },
  fox: { name: "Fox", grade: 4, formId: "g4-form-a", klass: "player-fox" },
};

export default function QuizSelect() {
  const { profile } = useParams();
  const p = profile as ProfileId;
  const meta = PROFILE_DISPLAY[p];
  const nav = useNavigate();
  const { content, status, load, formsById, passagesById } = useContentStore();
  const { loadFor, state } = useSessionStore();
  const { byProfile, load: loadProgress } = useProgressStore();
  const isAdmin = useAdminStore((s) => s.isAdmin);
  const [past, setPast] = useState<CompletedResult[]>([]);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadFor(p);
    void loadProgress(p);
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

  const completedByQuizId = useMemo(() => {
    const m = new Map<string, CompletedResult>();
    for (const r of past) if (r.quizId) m.set(r.quizId, r);
    return m;
  }, [past]);

  async function resetSingleQuiz(r: CompletedResult, label: string) {
    if (!confirm(`Reset ${label}? ${meta.name} can take it again from scratch.`))
      return;
    try {
      await api.deleteResult(p, r.id);
      if (state?.quizId === r.quizId) useSessionStore.setState({ state: null });
      refreshPast();
      void loadProgress(p);
    } catch (e) {
      alert(`Failed to reset: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function resetInProgress(label: string) {
    if (
      !confirm(
        `Reset ${label}? ${meta.name}'s in-progress work will be cleared and the quest starts fresh.`,
      )
    )
      return;
    try {
      await useSessionStore.getState().clear();
      refreshPast();
      void loadProgress(p);
    } catch (e) {
      alert(`Failed to reset: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function resetAll() {
    if (
      !confirm(
        `Reset ALL of ${meta.name}'s progress (in-progress session and every completed quiz)? This cannot be undone.`,
      )
    )
      return;
    setResetting(true);
    try {
      await api.resetProfile(p);
      useSessionStore.setState({ state: null });
      refreshPast();
      void loadProgress(p);
    } finally {
      setResetting(false);
    }
  }

  if (status !== "ready" || !content || !form) {
    return (
      <div className="stage">
        <div className="wrap" style={{ padding: 24, color: "var(--ink-soft)" }}>
          Loading…
        </div>
      </div>
    );
  }

  const summary = byProfile[p];
  const rank = summary?.rank;
  const totalXp = summary?.totalXp ?? 0;
  const xpPct = rank ? rankBarPct(totalXp, rank) : 0;

  const resumeQuizId =
    state?.formId === meta.formId ? state.quizId : undefined;
  const nextQuizId = quizzes.find(
    (q) => !completedByQuizId.has(q.quizId),
  )?.quizId;
  const doneCount = quizzes.filter((q) =>
    completedByQuizId.has(q.quizId),
  ).length;

  return (
    <div className={"stage " + meta.klass}>
      <AppBar profile={p} summary={summary} />

      {/* Discreet parent controls */}
      <div
        className="wrap"
        style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
      >
        <AdminBar />
        {isAdmin && (
          <button
            className="gbtn ghost sm"
            onClick={resetAll}
            disabled={resetting}
            style={{ color: "#b91c1c" }}
            title="Wipe all of this profile's progress"
          >
            {resetting ? "Resetting…" : "Reset all"}
          </button>
        )}
      </div>

      <div className="wrap" style={{ paddingBottom: 56, paddingTop: 12 }}>
        {/* Hero rank panel */}
        <div
          className="qcard pop-in"
          style={{
            padding: 22,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div className="avatar" style={{ width: 92, height: 92 }}>
            <Avatar player={p} />
          </div>
          <div>
            <div
              className="spread"
              style={{ alignItems: "flex-end", marginBottom: 8 }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    color: "var(--ink-soft)",
                    fontSize: ".85rem",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  Level {rank?.level ?? 1} · {rank?.rank ?? "Word Pup"}
                </div>
                <div className="h-display" style={{ fontSize: "1.7rem" }}>
                  Hi {meta.name}! Ready to read?
                </div>
              </div>
              <span className="chip accent" style={{ whiteSpace: "nowrap" }}>
                {totalXp} XP
              </span>
            </div>
            <div className="bar xp">
              <span style={{ width: xpPct + "%" }} />
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--ink-soft)",
                fontSize: ".82rem",
                marginTop: 6,
              }}
            >
              {rank?.next
                ? `${rank.xpToNext} XP to ${rank.next}`
                : "Top rank reached — you're a legend!"}
            </div>
          </div>
        </div>

        {/* Coach line */}
        <div className="coach pop-in" style={{ marginBottom: 24 }}>
          <div
            className="rq-col"
            style={{ alignItems: "center", flex: "0 0 auto" }}
          >
            <Moose size={56} />
            <span
              style={{
                fontWeight: 800,
                fontSize: ".68rem",
                color: "var(--ink-soft)",
              }}
            >
              MOOSE
            </span>
          </div>
          <div className="bubble">
            Pick your next quest, {meta.name}! Each one is a story or article
            with a few questions — earn stars and XP. You've got this! 🐾
          </div>
        </div>

        <div className="spread" style={{ marginBottom: 14 }}>
          <h2 className="h-display" style={{ fontSize: "1.4rem" }}>
            Your Quests
          </h2>
          <span className="chip">
            {doneCount} / {quizzes.length} cleared
          </span>
        </div>

        <div className="grid-cards">
          {quizzes.map((q) => {
            const done = completedByQuizId.get(q.quizId);
            const isNext = !done && q.quizId === nextQuizId;
            const isResume = !done && q.quizId === resumeQuizId;
            const frac =
              done && done.auto.possible > 0
                ? done.auto.earned / done.auto.possible
                : done
                  ? 1
                  : 0;
            const stars = done ? starsForFraction(frac) : 0;
            return (
              <button
                key={q.quizId}
                className="mission"
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
                aria-label={
                  done
                    ? `Quest ${q.quizN}, ${q.passage.title}, completed; opens review`
                    : `Quest ${q.quizN}, ${q.passage.title}, ${q.itemIds.length} questions`
                }
              >
                <div
                  className="banner"
                  style={{ background: bannerBg(!!done, isNext) }}
                >
                  <span className="badge-num">{q.quizN}</span>
                  <span className="glyph">{genreGlyph(q.passage)}</span>
                  {isNext && (
                    <span
                      className="chip accent"
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        fontSize: ".7rem",
                      }}
                    >
                      NEXT
                    </span>
                  )}
                  {done && (
                    <span
                      className="chip green"
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        fontSize: ".7rem",
                      }}
                    >
                      ✓ DONE
                    </span>
                  )}
                  {isResume && !isNext && (
                    <span
                      className="chip accent"
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        fontSize: ".7rem",
                      }}
                    >
                      RESUME
                    </span>
                  )}
                  {done && isAdmin && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Reset quest ${q.quizN}`}
                      title="Reset this quest"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        void resetSingleQuiz(
                          done,
                          `Quest ${q.quizN}: ${q.passage.title}`,
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          void resetSingleQuiz(
                            done,
                            `Quest ${q.quizN}: ${q.passage.title}`,
                          );
                        }
                      }}
                      className="chip"
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        cursor: "pointer",
                        color: "#b91c1c",
                        padding: "0.15rem 0.45rem",
                      }}
                    >
                      ↺
                    </span>
                  )}
                  {isResume && isAdmin && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Reset in-progress quest ${q.quizN}`}
                      title="Reset this in-progress quest"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        void resetInProgress(
                          `Quest ${q.quizN}: ${q.passage.title}`,
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          void resetInProgress(
                            `Quest ${q.quizN}: ${q.passage.title}`,
                          );
                        }
                      }}
                      className="chip"
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        cursor: "pointer",
                        color: "#b91c1c",
                        padding: "0.15rem 0.45rem",
                      }}
                    >
                      ↺
                    </span>
                  )}
                </div>
                <div className="body">
                  <div
                    style={{
                      fontSize: ".72rem",
                      fontWeight: 800,
                      color: "var(--ink-soft)",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    {genreLabel(q.passage)}
                  </div>
                  <div
                    className="h-display"
                    style={{
                      fontSize: "1.05rem",
                      margin: "2px 0 10px",
                      textWrap: "balance",
                    }}
                  >
                    {q.passage.title}
                  </div>
                  {done ? (
                    <div className="spread">
                      <Stars n={stars} />
                      <span
                        style={{
                          fontWeight: 800,
                          color: "var(--accent-ink)",
                          fontSize: ".82rem",
                        }}
                      >
                        Review ↻
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 800, color: "var(--accent-ink)" }}>
                      {isResume ? "▶ Resume quest" : "▶ Start quest"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function bannerBg(done: boolean, next: boolean): string {
  if (done) return "color-mix(in oklab, var(--green) 18%, var(--paper))";
  if (next) return "color-mix(in oklab, var(--accent) 18%, var(--paper))";
  return "var(--bg-2)";
}
