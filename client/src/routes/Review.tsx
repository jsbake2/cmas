import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import { flattenUnit } from "@/components/runner/types";
import { isItemAnswered, scoreItem } from "@/lib/scoring";
import { api, type ProfileId, type CompletedResult } from "@/api/client";

export default function Review() {
  const { profile, unitId } = useParams();
  const p = profile as ProfileId;
  const nav = useNavigate();
  const { content, status, load, formsById, itemsById } = useContentStore();
  const session = useSessionStore();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (session.profile !== p) void session.loadFor(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const formId = p === "olive" ? "g6-form-a" : "g4-form-a";
  const form = content && formsById.get(formId);
  const unit = form?.units.find((u) => u.id === unitId);
  const flat = useMemo(() => (unit ? flattenUnit(unit) : []), [unit]);

  if (status !== "ready" || !content || !unit) return <div className="p-6">Loading…</div>;
  if (!session.state || session.state.unitId !== unit.id) {
    return (
      <div className="p-6">
        No active session. <Link to={`/profile/${p}/forms`} className="underline text-accent">Back to units</Link>.
      </div>
    );
  }

  const responses = session.state.responses;
  const flags = session.state.flags;
  const answered = flat.filter((f) => {
    const it = itemsById.get(f.itemId);
    return it && isItemAnswered(it, responses[f.itemId]);
  }).length;
  const flagged = flat.filter((f) => !!flags[f.itemId]).length;

  async function submit() {
    if (!session.state || !unit) return;
    setSubmitting(true);
    try {
      const byItem: CompletedResult["auto"]["byItem"] = {};
      let earned = 0;
      let possible = 0;
      const parentScores: Record<string, number> = {};
      for (const f of flat) {
        const it = itemsById.get(f.itemId);
        if (!it) continue;
        const sc = scoreItem(it, responses[f.itemId]);
        byItem[f.itemId] = {
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
        unitId: unit.id,
        submittedAt: Date.now(),
        responses,
        flags,
        auto: { earned, possible, byItem },
        parentScores,
        meta: {
          highlights: session.state.highlights,
          notes: session.state.notes,
        },
      };
      const saved = await api.postResult(p, payload);
      await api.clearState(p);
      useSessionStore.setState({ state: null });
      nav(`/profile/${p}/results/${saved.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-4">
        <Link to={`/profile/${p}/run/${unit.id}`} className="text-sm text-accent underline">
          ← Back to the test
        </Link>
        <h1 className="font-ui text-2xl font-semibold mt-2">
          Review — {unit.title}
        </h1>
        <p className="text-muted text-sm">
          {answered} answered · {flat.length - answered} unanswered · {flagged} flagged
        </p>
      </header>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mb-6">
        {flat.map((f, i) => {
          const it = itemsById.get(f.itemId);
          const ans = it ? isItemAnswered(it, responses[f.itemId]) : false;
          const flag = !!flags[f.itemId];
          return (
            <button
              key={f.itemId}
              onClick={() => {
                session.setCurrentIndex(i);
                nav(`/profile/${p}/run/${unit.id}`);
              }}
              className="card text-left hover:bg-accentSoft flex items-center justify-between"
              aria-label={`Go to item ${i + 1}`}
            >
              <span>
                Item {i + 1}
                <span className="ml-2 text-xs text-muted">{it?.type}</span>
              </span>
              <span className="text-sm">
                {flag && <span className="text-accent mr-2">⚑</span>}
                <span
                  className={ans ? "text-accent font-semibold" : "text-muted"}
                >
                  {ans ? "Answered" : "Not answered"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-end border-t border-border pt-4">
        <Link to={`/profile/${p}/run/${unit.id}`} className="btn">
          Keep working
        </Link>
        <button
          className="btn btn-primary"
          disabled={submitting}
          onClick={() => {
            if (
              confirm(
                "Submit your answers? You'll see the results and can't change your responses after this.",
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
