import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ProfileId, type CompletedResult } from "@/api/client";

export default function Results() {
  const { profile } = useParams();
  const p = profile as ProfileId;
  const [list, setList] = useState<CompletedResult[] | null>(null);

  useEffect(() => {
    api.results(p).then(setList).catch(() => setList([]));
  }, [p]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-4">
        <Link to={`/profile/${p}/forms`} className="text-sm text-accent underline">
          ← Back
        </Link>
        <h1 className="font-ui text-2xl font-semibold mt-2">
          {p === "olive" ? "Olive" : "Fox"} — past results
        </h1>
      </header>

      {list === null && <div className="text-muted">Loading…</div>}
      {list && list.length === 0 && (
        <div className="card">No completed sessions yet.</div>
      )}
      <ul className="space-y-2">
        {list?.map((r) => (
          <li key={r.id}>
            <Link
              to={`/profile/${p}/results/${r.id}`}
              className="card flex items-center justify-between hover:bg-accentSoft"
            >
              <div>
                <div className="font-semibold">
                  {new Date(r.submittedAt).toLocaleString()}
                </div>
                <div className="text-sm text-muted">
                  {r.formId} · {r.unitId}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {Math.round(r.auto.earned * 10) / 10} / {r.auto.possible}
                </div>
                <div className="text-xs text-muted">auto-scored</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
