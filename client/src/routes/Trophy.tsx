import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProgressStore } from "@/store/progress";
import { BADGES, RANKS, tierBg } from "@/lib/progress";
import AppBar from "@/components/AppBar";
import { Avatar } from "@/components/Avatar";
import type { ProfileId } from "@/api/client";

const KLASS: Record<ProfileId, string> = {
  olive: "player-olive",
  fox: "player-fox",
};

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function Trophy() {
  const { profile } = useParams();
  const p = profile as ProfileId;
  const nav = useNavigate();
  const { byProfile, load } = useProgressStore();

  useEffect(() => {
    void load(p);
  }, [p, load]);

  const summary = byProfile[p];
  const rank = summary?.rank;
  const level = rank?.level ?? 1;
  const earned = summary?.badges ?? [];
  const streak = summary?.streakCount ?? 0;

  // Build a 7-day strip ending today. The last `streak` days (capped at 7)
  // count as practiced; today is highlighted.
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const isToday = i === 6;
    const daysAgo = 6 - i;
    const done = !isToday && daysAgo < Math.min(streak, 7);
    return { letter: DOW[d.getDay()], done, today: isToday };
  });

  return (
    <div className={"stage " + KLASS[p]}>
      <AppBar profile={p} summary={summary} showTrophies={false} />
      <div className="wrap" style={{ paddingBottom: 56 }}>
        <button
          className="gbtn ghost sm"
          onClick={() => nav(`/profile/${p}/quizzes`)}
          style={{ marginBottom: 16 }}
        >
          ← Back to quests
        </button>

        {/* Rank track */}
        <div className="qcard pop-in" style={{ padding: 22, marginBottom: 22 }}>
          <h2 className="h-display" style={{ fontSize: "1.3rem", marginTop: 0 }}>
            Your Rank
          </h2>
          <div
            className="rq-row"
            style={{ gap: 0, flexWrap: "wrap", marginTop: 10 }}
          >
            {RANKS.map((r, i) => {
              const reached = level > i;
              const isCur = level === i + 1;
              return (
                <div key={r.name} className="rq-row" style={{ gap: 0 }}>
                  <div
                    className="rq-col"
                    style={{ alignItems: "center", gap: 6, width: 92 }}
                  >
                    <div
                      className="avatar"
                      style={{
                        width: 50,
                        height: 50,
                        background: reached ? "var(--accent)" : "var(--bg-2)",
                        boxShadow: isCur
                          ? "0 0 0 4px var(--accent-soft), var(--shadow)"
                          : "var(--shadow)",
                      }}
                    >
                      {reached ? (
                        <Avatar player={p} />
                      ) : (
                        <span
                          style={{ fontWeight: 800, color: "var(--ink-soft)" }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: ".68rem",
                        textAlign: "center",
                        lineHeight: 1.1,
                        color: reached ? "var(--ink)" : "var(--ink-soft)",
                      }}
                    >
                      {r.name}
                    </div>
                  </div>
                  {i < RANKS.length - 1 && (
                    <div
                      style={{
                        width: 24,
                        height: 3,
                        background:
                          level > i + 1 ? "var(--accent)" : "var(--bg-2)",
                        marginTop: -18,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p
            style={{
              fontWeight: 700,
              color: "var(--ink-soft)",
              fontSize: ".82rem",
              margin: "14px 0 0",
            }}
          >
            🏅 Reach <strong>Reading Legend</strong> by scoring{" "}
            <strong>90%+ across all 12 quests</strong>. Every quest is worth up
            to 100 XP — give it your best read!
          </p>
        </div>

        {/* Streak */}
        <div className="qcard pop-in" style={{ padding: 22, marginBottom: 22 }}>
          <div className="spread">
            <h2 className="h-display" style={{ fontSize: "1.3rem", margin: 0 }}>
              Practice Streak
            </h2>
            <span className="chip gold">🔥 {streak} days</span>
          </div>
          <div className="streak-days" style={{ marginTop: 14 }}>
            {days.map((d, i) => (
              <div
                key={i}
                className={
                  "sday" + (d.done ? " done" : "") + (d.today ? " today" : "")
                }
              >
                <span>{d.letter}</span>
                <span style={{ fontSize: "1rem" }}>
                  {d.done ? "🔥" : d.today ? "⭐" : "·"}
                </span>
              </div>
            ))}
          </div>
          <p
            style={{
              fontWeight: 700,
              color: "var(--ink-soft)",
              fontSize: ".85rem",
              marginBottom: 0,
              marginTop: 12,
            }}
          >
            Practice today to keep your streak alive!
          </p>
        </div>

        {/* Badges */}
        <h2 className="h-display" style={{ fontSize: "1.3rem", marginBottom: 12 }}>
          Badges{" "}
          <span style={{ color: "var(--ink-soft)", fontSize: "1rem" }}>
            · {earned.length} / {BADGES.length}
          </span>
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(132px,1fr))",
            gap: 16,
          }}
        >
          {BADGES.map((b) => {
            const has = earned.includes(b.id);
            return (
              <div key={b.id} className={"badge" + (has ? "" : " lock")}>
                <div
                  className="disc"
                  style={{ background: has ? tierBg(b.tier) : "var(--bg-2)" }}
                >
                  {has ? b.icon : "🔒"}
                </div>
                <div className="name">{b.name}</div>
                <div
                  style={{
                    fontSize: ".68rem",
                    color: "var(--ink-soft)",
                    fontWeight: 700,
                    lineHeight: 1.15,
                  }}
                >
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
