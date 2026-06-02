import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useProgressStore } from "@/store/progress";
import { BADGES_BY_ID, rankBarPct, starsForFraction, tierBg } from "@/lib/progress";
import { Confetti, Stars } from "@/components/GameBits";
import { Moose } from "@/components/Avatar";
import AppBar from "@/components/AppBar";
import type { ProfileId, ProgressSummary } from "@/api/client";

const KLASS: Record<ProfileId, string> = {
  olive: "player-olive",
  fox: "player-fox",
};

interface CelebrateState {
  before: ProgressSummary | null;
  after: ProgressSummary;
  quizN: number;
  title: string;
  earned: number;
  possible: number;
}

export default function Celebrate() {
  const { profile, resultId } = useParams();
  const p = profile as ProfileId;
  const nav = useNavigate();
  const loc = useLocation();
  const data = loc.state as CelebrateState | null;
  const setProgress = useProgressStore((s) => s.set);

  // If we got fresh data on navigation, sync it into the store.
  useEffect(() => {
    if (data?.after) setProgress(p, data.after);
  }, [data, p, setProgress]);

  if (!data) {
    // Direct navigation / refresh — no celebration payload. Send to results.
    return (
      <div className="stage">
        <div className="wrap" style={{ padding: 24 }}>
          <p style={{ color: "var(--ink-soft)", marginBottom: 12 }}>
            Nothing to celebrate here — your score is saved.
          </p>
          <Link className="gbtn" to={`/profile/${p}/results/${resultId}`}>
            See your results →
          </Link>
        </div>
      </div>
    );
  }

  return <CelebrateView p={p} resultId={resultId!} data={data} nav={nav} />;
}

function CelebrateView({
  p,
  resultId,
  data,
  nav,
}: {
  p: ProfileId;
  resultId: string;
  data: CelebrateState;
  nav: ReturnType<typeof useNavigate>;
}) {
  const { before, after, title, earned, possible } = data;
  const frac = possible > 0 ? earned / possible : 1;
  const stars = starsForFraction(frac);
  const xpGain = before ? Math.max(0, after.totalXp - before.totalXp) : null;
  const rankedUp = before ? after.rank.level > before.rank.level : false;
  const newBadges = before
    ? after.badges.filter((b) => !before.badges.includes(b))
    : [];

  const startPct = before
    ? rankBarPct(before.totalXp, before.rank)
    : rankBarPct(after.totalXp, after.rank);
  const endPct = rankBarPct(after.totalXp, after.rank);
  const [pct, setPct] = useState(startPct);

  useEffect(() => {
    const t = setTimeout(() => setPct(endPct), 700);
    return () => clearTimeout(t);
  }, [endPct]);

  return (
    <div className={"stage " + KLASS[p]}>
      <Confetti />
      <AppBar profile={p} summary={after} />
      <div
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 20,
          paddingBottom: 50,
        }}
      >
        <div className="pop-in">
          <Moose size={118} celebrate />
        </div>
        <h1
          className="h-display pop-in"
          style={{
            fontSize: "clamp(2rem,5vw,3rem)",
            textAlign: "center",
            margin: "6px 0 2px",
          }}
        >
          Quest Complete!
        </h1>
        <p style={{ fontWeight: 800, color: "var(--ink-soft)", marginTop: 0 }}>
          {title}
        </p>

        <div
          className="qcard pop-in"
          style={{
            padding: 26,
            width: "100%",
            maxWidth: 460,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          <Stars n={stars} animate />
          <div className="h-display" style={{ fontSize: "2.6rem", marginTop: 10 }}>
            {Math.round(earned * 10) / 10}
            <span style={{ color: "var(--ink-soft)", fontSize: "1.4rem" }}>
              {" "}
              / {possible}
            </span>
          </div>
          <div style={{ fontWeight: 800, color: "var(--green)", marginBottom: 18 }}>
            Great reading! 🎉
          </div>

          <div
            className="spread"
            style={{ fontWeight: 800, fontSize: ".85rem", marginBottom: 6 }}
          >
            <span>
              Level {after.rank.level} · {after.rank.rank}
            </span>
            {xpGain != null && <span className="chip gold">+{xpGain} XP</span>}
          </div>
          <div className="bar xp">
            <span style={{ width: pct + "%" }} />
          </div>
          <div
            style={{
              fontWeight: 700,
              color: "var(--ink-soft)",
              fontSize: ".8rem",
              marginTop: 6,
            }}
          >
            {after.rank.next
              ? `${after.rank.xpToNext} XP to ${after.rank.next}`
              : "Top rank reached — you're a legend!"}
          </div>

          {rankedUp && (
            <div style={{ marginTop: 16, animation: "badge-burst 600ms 700ms both" }}>
              <span
                className="chip"
                style={{
                  background: "var(--gold)",
                  color: "#2a2118",
                  fontSize: "1rem",
                  padding: ".5rem 1rem",
                }}
              >
                ⭐ RANK UP! → {after.rank.rank}
              </span>
            </div>
          )}

          {newBadges.map((bid, i) => {
            const b = BADGES_BY_ID.get(bid);
            if (!b) return null;
            return (
              <div
                key={bid}
                style={{
                  marginTop: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  justifyContent: "center",
                  animation: `badge-burst 600ms ${900 + i * 250}ms both`,
                }}
              >
                <div
                  className="badge"
                  style={{ width: 78, height: 78, padding: 0 }}
                >
                  <div
                    className="disc"
                    style={{ width: 48, height: 48, background: tierBg(b.tier) }}
                  >
                    {b.icon}
                  </div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: ".75rem",
                      color: "var(--ink-soft)",
                    }}
                  >
                    NEW BADGE
                  </div>
                  <div className="h-display" style={{ fontSize: "1.1rem" }}>
                    {b.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rq-row" style={{ marginTop: 24, gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="gbtn ghost" to={`/profile/${p}/trophies`}>
            🏆 Trophy Room
          </Link>
          <Link className="gbtn ghost sm" to={`/profile/${p}/results/${resultId}`}>
            See answers
          </Link>
          <button
            className="gbtn"
            onClick={() => nav(`/profile/${p}/quizzes`)}
          >
            Next quest →
          </button>
        </div>
      </div>
    </div>
  );
}
