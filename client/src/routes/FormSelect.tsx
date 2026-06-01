import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import { api, type ProfileId } from "@/api/client";
import { useState } from "react";
import type { CompletedResult } from "@/api/client";

export default function FormSelect() {
  const { profile } = useParams();
  const p = profile as ProfileId;
  const nav = useNavigate();
  const { content, status, load, formsById } = useContentStore();
  const { loadFor, state } = useSessionStore();
  const [past, setPast] = useState<CompletedResult[]>([]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadFor(p);
    api.results(p).then(setPast).catch(() => setPast([]));
  }, [p, loadFor]);

  if (status !== "ready" || !content)
    return <Loading />;

  const formId = p === "olive" ? "g6-form-a" : "g4-form-a";
  const form = formsById.get(formId);
  if (!form) return <div className="p-6">Form not found: {formId}</div>;

  return (
    <div className="max-w-4xl w-full mx-auto p-6">
      <header className="mb-6">
        <Link to="/" className="text-sm text-accent underline">
          ← Switch profile
        </Link>
        <h1 className="font-ui text-2xl font-semibold mt-2">
          {p === "olive" ? "Olive" : "Fox"} — {form.title}
        </h1>
      </header>

      {state && state.formId === formId && (
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <div className="font-semibold">Resume in progress</div>
            <div className="text-sm text-muted">
              Unit {state.unitId} · item {state.currentIndex + 1}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn"
              onClick={() => {
                if (confirm("Discard in-progress session and start over?")) {
                  void useSessionStore.getState().clear();
                }
              }}
            >
              Discard
            </button>
            <button
              className="btn btn-primary"
              onClick={() => nav(`/profile/${p}/run/${state.unitId}`)}
            >
              Resume
            </button>
          </div>
        </div>
      )}

      <h2 className="font-ui font-semibold text-lg mb-3">Units</h2>
      <div className="grid gap-3">
        {form.units.map((u) => {
          const itemCount = u.sections.reduce(
            (n, s) => n + s.itemIds.length,
            0,
          );
          const passCount = u.sections.reduce(
            (n, s) => n + s.passageIds.length,
            0,
          );
          return (
            <button
              key={u.id}
              className="card text-left hover:bg-accentSoft"
              onClick={() => {
                useSessionStore
                  .getState()
                  .startSession(p, formId, u.id);
                nav(`/profile/${p}/run/${u.id}`);
              }}
            >
              <div className="flex justify-between items-baseline">
                <div className="text-lg font-semibold">{u.title}</div>
                <div className="text-sm text-muted">
                  {passCount} passage{passCount === 1 ? "" : "s"} ·{" "}
                  {itemCount} items
                  {u.timeLimitMinutes ? ` · ${u.timeLimitMinutes} min` : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        <Link className="btn" to={`/profile/${p}/settings`}>
          Settings
        </Link>
        <Link className="btn" to={`/profile/${p}/results`}>
          Past results ({past.length})
        </Link>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="p-6 text-muted">Loading…</div>;
}
