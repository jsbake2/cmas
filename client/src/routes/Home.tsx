import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useContentStore } from "@/store/content";

const PROFILES: Array<{
  id: "olive" | "fox";
  name: string;
  grade: number;
  formId: string;
  swatch: string;
}> = [
  { id: "olive", name: "Olive", grade: 6, formId: "g6-form-a", swatch: "#6d28d9" },
  { id: "fox", name: "Fox", grade: 4, formId: "g4-form-a", swatch: "#ea580c" },
];

export default function Home() {
  const nav = useNavigate();
  const { status, load, error } = useContentStore();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <h1 className="font-ui text-3xl sm:text-4xl font-semibold mb-2">
        Who's practicing?
      </h1>
      <p className="text-muted mb-10 text-center max-w-md">
        Pick your name to begin a CMAS-style practice session.
      </p>

      {status === "loading" && <p className="text-muted">Loading content…</p>}
      {status === "error" && (
        <p className="text-red-600 mb-4 text-center">
          Couldn't load content: {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl w-full">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            disabled={status !== "ready"}
            onClick={() => nav(`/profile/${p.id}/quizzes`)}
            className="card text-left p-6 sm:p-8 hover:bg-accentSoft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Start as ${p.name}, grade ${p.grade}`}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: p.swatch }}
                aria-hidden="true"
              >
                {p.name[0]}
              </div>
              <div>
                <div className="text-2xl font-semibold">{p.name}</div>
                <div className="text-muted">Grade {p.grade}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-sm">
        <Link className="text-accent underline" to="/review">
          Parent review — see both kids' results
        </Link>
      </div>
    </div>
  );
}
