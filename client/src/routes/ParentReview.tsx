import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CompletedResult } from "@/api/client";

export default function ParentReview() {
  const [all, setAll] = useState<CompletedResult[] | null>(null);

  useEffect(() => {
    api.allResults().then(setAll).catch(() => setAll([]));
  }, []);

  const olive = all?.filter((r) => r.profile === "olive") ?? [];
  const fox = all?.filter((r) => r.profile === "fox") ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-4">
        <Link to="/" className="text-sm text-accent underline">
          ← Home
        </Link>
        <h1 className="font-ui text-2xl font-semibold mt-2">Parent review</h1>
        <p className="text-muted text-sm">
          All completed sessions for both children. Click any to see per-item
          details and score written responses.
        </p>
      </header>

      {all === null && <div className="text-muted">Loading…</div>}

      <div className="grid gap-6 sm:grid-cols-2">
        <ChildColumn title="Olive (Grade 6)" results={olive} who="olive" />
        <ChildColumn title="Fox (Grade 4)" results={fox} who="fox" />
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
