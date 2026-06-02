import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useProgressStore } from "@/store/progress";
import { Avatar, Moose } from "@/components/Avatar";
import { BADGES_BY_ID, tierBg } from "@/lib/progress";
import type { ProfileId } from "@/api/client";

const PROFILES: Array<{
  id: ProfileId;
  name: string;
  grade: number;
  klass: string;
}> = [
  { id: "olive", name: "Olive", grade: 6, klass: "player-olive" },
  { id: "fox", name: "Fox", grade: 4, klass: "player-fox" },
];

export default function Home() {
  const nav = useNavigate();
  const { status, load, error } = useContentStore();
  const { byProfile, load: loadProgress } = useProgressStore();

  useEffect(() => {
    void load();
    void loadProgress("olive");
    void loadProgress("fox");
  }, [load, loadProgress]);

  return (
    <div className="stage">
      <div className="appbar wrap">
        <span className="brandmark">
          <span className="logo">
            <Moose size={30} />
          </span>
          Reading Quest
        </span>
        <span className="chip">Practice Adventure</span>
      </div>

      <div
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
          paddingBottom: 48,
        }}
      >
        <div className="pop-in" style={{ textAlign: "center", marginBottom: 4 }}>
          <Moose size={104} celebrate />
        </div>
        <h1
          className="h-display pop-in"
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3rem)",
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          Who's playing today?
        </h1>
        <p
          style={{
            color: "var(--ink-soft)",
            fontWeight: 700,
            marginTop: 0,
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          Pick your name to start your reading quest.
        </p>

        {status === "error" && (
          <p style={{ color: "var(--pink)", marginBottom: 16 }}>
            Couldn't load content: {error}
          </p>
        )}

        <div className="home-cards">
          {PROFILES.map((p, i) => {
            const summary = byProfile[p.id];
            const earned = summary?.badges ?? [];
            return (
              <button
                key={p.id}
                disabled={status !== "ready"}
                className={"qcard " + p.klass}
                onClick={() => nav(`/profile/${p.id}/quizzes`)}
                style={{
                  padding: 26,
                  cursor: status === "ready" ? "pointer" : "not-allowed",
                  opacity: status === "ready" ? 1 : 0.6,
                  textAlign: "center",
                  animation: `pop-in 420ms ${120 + i * 110}ms both`,
                }}
                aria-label={`Start as ${p.name}, grade ${p.grade}`}
              >
                <div
                  className="avatar"
                  style={{ width: 108, height: 108, margin: "0 auto 14px" }}
                >
                  <Avatar player={p.id} />
                </div>
                <div className="h-display" style={{ fontSize: "2rem" }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: "var(--ink-soft)",
                    marginBottom: 12,
                  }}
                >
                  Grade {p.grade}
                </div>
                <div
                  className="rq-row"
                  style={{ justifyContent: "center", gap: 8, marginBottom: 14 }}
                >
                  <span className="chip accent">
                    {summary?.rank.rank ?? "Word Pup"}
                  </span>
                  <span className="chip gold">🔥 {summary?.streakCount ?? 0}</span>
                </div>
                <div
                  style={{
                    fontSize: ".68rem",
                    fontWeight: 800,
                    color: "var(--ink-soft)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 6,
                  }}
                >
                  {earned.length} badge{earned.length === 1 ? "" : "s"} earned
                </div>
                <div className="shelf" style={{ marginBottom: 18, minHeight: 36 }}>
                  {earned.map((bid) => {
                    const b = BADGES_BY_ID.get(bid);
                    if (!b) return null;
                    return (
                      <span
                        key={bid}
                        className="shelf-badge"
                        title={`${b.name} — ${b.desc}`}
                        style={{ background: tierBg(b.tier) }}
                      >
                        {b.icon}
                      </span>
                    );
                  })}
                </div>
                <span className="gbtn" style={{ width: "100%" }}>
                  Let's go! →
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="gbtn ghost sm"
          style={{ marginTop: 30 }}
          onClick={() => nav("/review")}
        >
          👪 Grown-up: see both kids' results
        </button>
      </div>
    </div>
  );
}
