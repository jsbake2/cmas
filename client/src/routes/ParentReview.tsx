import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CompletedResult } from "@/api/client";
import { useAdminStore } from "@/store/admin";
import AdminBar from "@/components/AdminBar";

export default function ParentReview() {
  const isAdmin = useAdminStore((s) => s.isAdmin);
  const [all, setAll] = useState<CompletedResult[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.allResults().then(setAll).catch(() => setAll([]));
  }, [isAdmin]);

  if (!isAdmin) {
    return <PasswordGate />;
  }

  const olive = all?.filter((r) => r.profile === "olive") ?? [];
  const fox = all?.filter((r) => r.profile === "fox") ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/" className="text-sm text-accent underline">
            ← Home
          </Link>
          <h1 className="font-ui text-2xl font-semibold mt-2">
            Parent review
          </h1>
          <p className="text-muted text-sm">
            All completed sessions for both children. Click any to see
            per-item details and score written responses.
          </p>
        </div>
        <AdminBar />
      </header>

      {all === null && <div className="text-muted">Loading…</div>}

      <div className="grid gap-6 sm:grid-cols-2">
        <ChildColumn title="Olive (Grade 6)" results={olive} who="olive" />
        <ChildColumn title="Fox (Grade 4)" results={fox} who="fox" />
      </div>
    </div>
  );
}

function PasswordGate() {
  const unlock = useAdminStore((s) => s.unlock);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unlock(pw)) {
      setErr(true);
      setPw("");
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="card max-w-md w-full">
        <h1 className="font-ui text-xl font-semibold mb-2">
          Parent review — locked
        </h1>
        <p className="text-sm text-muted mb-4">
          This page shows both kids' results and is for grown-ups only. Enter
          the parent password to continue.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr(false);
            }}
            className="border border-border rounded px-3 py-2 bg-paper text-ink"
            placeholder="parent password"
            aria-label="Parent password"
          />
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary">
              Unlock
            </button>
            <Link to="/" className="text-accent underline text-sm">
              ← Back to home
            </Link>
          </div>
          {err && (
            <div className="text-sm" style={{ color: "#b91c1c" }}>
              Wrong password.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function ChildColumn({
  title,
  results,
  who,
}: {
  title: string;
  results: CompletedResult[];
  who: "olive" | "fox";
}) {
  return (
    <section>
      <h2 className="font-ui font-semibold text-lg mb-2">{title}</h2>
      {results.length === 0 ? (
        <div className="card text-muted">No completed sessions yet.</div>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                to={`/profile/${who}/results/${r.id}`}
                className="card flex justify-between hover:bg-accentSoft"
              >
                <div>
                  <div className="text-sm font-semibold">
                    Quiz {r.quizId}: {r.passageTitle ?? r.unitId}
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(r.submittedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {Math.round(r.auto.earned * 10) / 10} / {r.auto.possible}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
