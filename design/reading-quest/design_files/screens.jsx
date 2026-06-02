/* global React, Scout, QUEST */
const { useState, useEffect, useRef } = React;

/* ---------- small bits ---------- */
function StarIcon({ on }) {
  return (
    <svg className={"star " + (on ? "on" : "off")} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L14.7 8.6 L21.8 9.2 L16.4 13.9 L18.1 20.8 L12 17.1 L5.9 20.8 L7.6 13.9 L2.2 9.2 L9.3 8.6 Z" />
    </svg>
  );
}
function Stars({ n, max = 3, animate = false }) {
  return (
    <span className="stars" aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={animate ? { animation: `pop-in 380ms ${300 + i * 220}ms both` } : undefined}>
          <StarIcon on={i < n} />
        </span>
      ))}
    </span>
  );
}

const CONFETTI_COLORS = ["var(--gold)", "var(--orange)", "var(--purple)", "var(--green)", "var(--blue)", "var(--pink)"];
function Confetti({ run, count = 90 }) {
  if (!run) return null;
  const pieces = Array.from({ length: count }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const dur = 1.8 + Math.random() * 1.6;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const w = 7 + Math.random() * 8;
    return (
      <i key={i} style={{
        left: left + "vw", background: color,
        width: w + "px", height: (w * 1.4) + "px",
        animationDelay: delay + "s", animationDuration: dur + "s",
        borderRadius: Math.random() > 0.5 ? "50%" : "3px",
      }} />
    );
  });
  return <div className="confetti" aria-hidden="true">{pieces}</div>;
}

function RankBadge({ level }) {
  return (
    <span className="chip accent" title="Your level">
      <strong style={{ fontFamily: "var(--font-display)" }}>LV {level}</strong>
    </span>
  );
}

const badgeById = Object.fromEntries(QUEST.BADGES.map((b) => [b.id, b]));
const THEMES = [
  { id: "day",   label: "Day",   sw: "#eef0fb" },
  { id: "dusk",  label: "Dusk",  sw: "#f3ead7" },
  { id: "night", label: "Night", sw: "#1f1f29" },
];
const SIZES = [["s", "A-"], ["m", "A"], ["l", "A+"], ["xl", "A++"]];

function SettingsMenu({ theme, textSize, setTheme, setTextSize }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="settings-wrap">
      <button className="gbtn ghost sm" aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Settings">⚙️</button>
      {open && (
        <div className="popover">
          <h4>Color theme</h4>
          <div className="seg">
            {THEMES.map((t) => (
              <button key={t.id} className="theme-swatch" aria-pressed={theme === t.id} title={t.label}
                style={{ background: t.sw }} onClick={() => setTheme(t.id)} />
            ))}
          </div>
          <h4>Reading text size</h4>
          <div className="seg">
            {SIZES.map(([id, lbl]) => (
              <button key={id} className="seg-btn" aria-pressed={textSize === id} onClick={() => setTextSize(id)}>{lbl}</button>
            ))}
          </div>
          <button className="gbtn sm" style={{ width: "100%" }} onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}

/* ---------- App bar ---------- */
function AppBar({ player, rankInfo, onHome, onTrophy, settings }) {
  return (
    <div className="appbar wrap">
      <button className="brandmark" onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}>
        <span className="logo"><Scout pose="idle" size={30} /></span>
        Reading Quest
      </button>
      {player && (
        <div className="row">
          <span className="chip gold">🔥 {player.streak}</span>
          <RankBadge level={rankInfo.level} />
          <button className="gbtn ghost sm" onClick={onTrophy}>🏆 Trophies</button>
          {settings && <SettingsMenu {...settings} />}
          <div className="avatar" style={{ width: 46, height: 46 }}><Avatar player={player} pose="happy" size={40} /></div>
        </div>
      )}
    </div>
  );
}

/* ---------- HOME ---------- */
function Home({ onPick }) {
  const players = [QUEST.PLAYERS.olive, QUEST.PLAYERS.fox];
  return (
    <div className="stage">
      <div className="appbar wrap">
        <span className="brandmark"><span className="logo" style={{ background: "var(--purple)" }}><Scout pose="idle" size={30} /></span>Reading Quest</span>
        <span className="chip">Practice Adventure</span>
      </div>

      <div className="wrap" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 12, paddingBottom: 48 }}>
        <div className="pop-in" style={{ textAlign: "center", marginBottom: 4 }}>
          <Scout pose="celebrate" size={104} />
        </div>
        <h1 className="h-display pop-in" style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", textAlign: "center", margin: "0 0 8px" }}>
          Who's playing today?
        </h1>
        <p style={{ color: "var(--ink-soft)", fontWeight: 700, marginTop: 0, marginBottom: 30, textAlign: "center" }}>
          Pick your name to start your reading quest.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: "100%", maxWidth: 760 }} className="home-cards">
          {players.map((p, i) => {
            const ri = QUEST.rankFor(p.xp);
            return (
              <button key={p.id} className={"card " + p.klass} onClick={() => onPick(p.id)}
                style={{ padding: 26, cursor: "pointer", textAlign: "center", animation: `pop-in 420ms ${120 + i * 110}ms both` }}>
                <div className="avatar" style={{ width: 108, height: 108, margin: "0 auto 14px" }}>
                  <Avatar player={p} pose="happy" size={92} />
                </div>
                <div className="h-display" style={{ fontSize: "2rem" }}>{p.name}</div>
                <div style={{ fontWeight: 800, color: "var(--ink-soft)", marginBottom: 12 }}>Grade {p.grade}</div>
                <div className="row" style={{ justifyContent: "center", gap: 8, marginBottom: 14 }}>
                  <span className="chip accent">{ri.rank.name}</span>
                  <span className="chip gold">🔥 {p.streak}</span>
                </div>
                <div style={{ fontSize: ".68rem", fontWeight: 800, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                  {QUEST.EARNED[p.id].length} badges earned
                </div>
                <div className="shelf" style={{ marginBottom: 18 }}>
                  {QUEST.EARNED[p.id].map((bid) => {
                    const b = badgeById[bid];
                    if (!b) return null;
                    return <span key={bid} className="shelf-badge" title={b.name + " — " + b.desc} style={{ background: tierBg(b.tier) }}>{b.icon}</span>;
                  })}
                </div>
                <span className="gbtn" style={{ width: "100%" }}>Let's go! →</span>
              </button>
            );
          })}
        </div>

        <button className="gbtn ghost sm" style={{ marginTop: 30 }} onClick={() => onPick("parent")}>
          👪 Grown-up: see both kids' results
        </button>
      </div>
    </div>
  );
}

/* ---------- HUB / mission select ---------- */
function Hub({ player, rankInfo, onStart, onHome, onTrophy, settings }) {
  const pct = rankInfo.next
    ? Math.round(((player.xp - rankInfo.rank.min) / (rankInfo.next.min - rankInfo.rank.min)) * 100)
    : 100;
  const xpToNext = rankInfo.next ? rankInfo.next.min - player.xp : 0;
  const done = player.missions.filter((m) => m.status === "done").length;

  return (
    <div className={"stage " + player.klass}>
      <AppBar player={player} rankInfo={rankInfo} onHome={onHome} onTrophy={onTrophy} settings={settings} />

      <div className="wrap" style={{ paddingBottom: 56 }}>
        {/* Hero rank panel */}
        <div className="card pop-in" style={{ padding: 22, marginBottom: 20, display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center" }}>
          <div className="avatar" style={{ width: 92, height: 92 }}><Avatar player={player} pose="happy" size={78} /></div>
          <div>
            <div className="spread" style={{ alignItems: "flex-end", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 800, color: "var(--ink-soft)", fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Level {rankInfo.level} · {rankInfo.rank.name}
                </div>
                <div className="h-display" style={{ fontSize: "1.7rem" }}>Hi {player.name}! Ready to read?</div>
              </div>
              <span className="chip accent" style={{ whiteSpace: "nowrap" }}>{player.xp} XP</span>
            </div>
            <div className="bar xp"><span style={{ width: pct + "%" }} /></div>
            <div style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: ".82rem", marginTop: 6 }}>
              {rankInfo.next ? `${xpToNext} XP to ${rankInfo.next.name}` : "Top rank reached — you're a legend!"}
            </div>
          </div>
        </div>

        {/* Coach line */}
        <div className="coach pop-in" style={{ marginBottom: 24 }}>
          <div className="col" style={{ alignItems: "center", flex: "0 0 auto" }}>
            <Scout pose="happy" size={56} />
            <span style={{ fontWeight: 800, fontSize: ".68rem", color: "var(--ink-soft)" }}>MOOSE</span>
          </div>
          <div className="bubble">Pick your next quest, {player.name}! Each one is a story or article with a few questions — earn stars and XP. You've got this! 🐾</div>
        </div>

        <div className="spread" style={{ marginBottom: 14 }}>
          <h2 className="h-display" style={{ fontSize: "1.4rem" }}>Your Quests</h2>
          <span className="chip">{done} / {player.missions.length} cleared</span>
        </div>

        <div className="grid-cards">
          {player.missions.map((m) => {
            const current = m.status === "current";
            const done = m.status === "done";
            return (
              <button key={m.n} className="mission" onClick={() => onStart(m)}>
                <div className="banner" style={{ background: bannerBg(m, current) }}>
                  <span className="badge-num">{m.n}</span>
                  <span className="glyph">{m.glyph}</span>
                  {current && <span className="chip accent" style={{ position: "absolute", bottom: 8, right: 8, fontSize: ".7rem" }}>NEXT</span>}
                  {done && <span className="chip green" style={{ position: "absolute", bottom: 8, right: 8, fontSize: ".7rem" }}>✓ DONE</span>}
                </div>
                <div className="body">
                  <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".05em" }}>{m.genre}</div>
                  <div className="h-display" style={{ fontSize: "1.05rem", margin: "2px 0 10px", textWrap: "balance" }}>{m.title}</div>
                  {done
                    ? <div className="spread"><Stars n={m.stars} /><span style={{ fontWeight: 800, color: "var(--accent-ink)", fontSize: ".82rem" }}>Play again ↻</span></div>
                    : <span style={{ fontWeight: 800, color: "var(--accent-ink)" }}>▶ Start quest</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function bannerBg(m, current) {
  if (m.status === "done") return "color-mix(in oklab, var(--green) 18%, var(--paper))";
  if (current) return "color-mix(in oklab, var(--accent) 18%, var(--paper))";
  return "var(--bg-2)";
}

/* ---------- SOBER RUNNER PEEK ---------- */
function RunnerPeek({ player, rankInfo, onFinish, onHome, settings }) {
  const it = QUEST.SAMPLE_ITEM;
  const [sel, setSel] = useState(null);
  return (
    <div className={"stage " + player.klass}>
      <AppBar player={player} rankInfo={rankInfo} onHome={onHome} onTrophy={() => {}} settings={settings} />
      <div className="wrap" style={{ paddingBottom: 30 }}>
        <div className="chip" style={{ marginBottom: 10 }}>🧪 Test view — kept plain on purpose, just like real CMAS</div>
        <div className="card sober" style={{ overflow: "hidden", padding: 0 }}>
          {/* sober toolbar */}
          <div className="s-top row" style={{ gap: 8, flexWrap: "wrap" }}>
            {["✏️ Highlighter", "✂️ Eliminate", "📝 Notes", "📏 Line reader", "🔍 Zoom"].map((t) => (
              <span key={t} className="s-tool">{t}</span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: ".8rem", color: "#475569", fontWeight: 700 }}>Item 4 of 6</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr" }}>
            {/* passage */}
            <div style={{ padding: 20, borderRight: "1px solid #cbd5e1" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>{it.passageTitle}</div>
              {it.paragraphs.map((para, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "#64748b", background: "#e2e8f0", borderRadius: 99, padding: "1px 8px", height: "fit-content" }}>{i + 1}</span>
                  <p className="s-passage" style={{ margin: 0 }}>{para}</p>
                </div>
              ))}
            </div>
            {/* item */}
            <div style={{ padding: 20 }}>
              <p style={{ fontWeight: 700, color: "#0f172a", marginTop: 0 }}>{it.stem}</p>
              <div className="col" style={{ gap: 10 }}>
                {it.options.map((o) => (
                  <label key={o.id} className={"s-option row " + (sel === o.id ? "sel" : "")} style={{ gap: 10 }}>
                    <input type="radio" name="q" checked={sel === o.id} onChange={() => setSel(o.id)} />
                    <span><strong>{o.id.toUpperCase()}.</strong> {o.text}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* bottom bar */}
          <div className="s-top spread" style={{ borderTop: "1px solid #cbd5e1", borderBottom: "none" }}>
            <span className="s-tool">← Back</span>
            <span style={{ fontSize: ".8rem", color: "#475569", fontWeight: 700 }}>⚑ Flag for review</span>
            <span className="s-tool">Next →</span>
          </div>
        </div>

        <div className="spread" style={{ marginTop: 18 }}>
          <button className="gbtn ghost" onClick={onHome}>Quit</button>
          <button className="gbtn green" onClick={onFinish}>Finish quest & see score →</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- RESULTS / celebration ---------- */
function Results({ player, rankInfo, onContinue, onTrophy, onHome, settings }) {
  const earned = 6, possible = 6;          // objective items on "The Tryout"
  const frac = earned / possible;
  const stars = frac >= 0.9 ? 3 : frac >= 0.75 ? 2 : 1;
  const xpGain = QUEST.quizXp(frac);       // up to 100 per quiz
  const newXp = player.xp + xpGain;
  const before = QUEST.rankFor(player.xp);
  const after = QUEST.rankFor(newXp);
  const rankedUp = after.level > before.level;

  const [phase, setPhase] = useState(0); // 0 burst, 1 xp fills
  const [xpPct, setXpPct] = useState(barPct(before, player.xp));
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setXpPct(after.next ? Math.round(((newXp - after.rank.min) / (after.next.min - after.rank.min)) * 100) : 100), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={"stage " + player.klass}>
      <Confetti run={true} />
      <AppBar player={player} rankInfo={after} onHome={onHome} onTrophy={onTrophy} settings={settings} />
      <div className="wrap" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 20, paddingBottom: 50 }}>
        <div className="pop-in"><Scout pose="celebrate" size={118} /></div>
        <h1 className="h-display pop-in" style={{ fontSize: "clamp(2rem,5vw,3rem)", textAlign: "center", margin: "6px 0 2px" }}>Quest Complete!</h1>
        <p style={{ fontWeight: 800, color: "var(--ink-soft)", marginTop: 0 }}>The Tryout</p>

        <div className="card pop-in" style={{ padding: 26, width: "100%", maxWidth: 460, textAlign: "center", marginTop: 6 }}>
          <Stars n={stars} animate={true} />
          <div className="h-display" style={{ fontSize: "2.6rem", marginTop: 10 }}>{earned}<span style={{ color: "var(--ink-soft)", fontSize: "1.4rem" }}> / {possible}</span></div>
          <div style={{ fontWeight: 800, color: "var(--green)", marginBottom: 18 }}>Great reading! 🎉</div>

          {/* XP */}
          <div className="spread" style={{ fontWeight: 800, fontSize: ".85rem", marginBottom: 6 }}>
            <span>Level {after.level} · {after.rank.name}</span>
            <span className="chip gold">+{xpGain} XP</span>
          </div>
          <div className="bar xp"><span style={{ width: xpPct + "%" }} /></div>

          {rankedUp && (
            <div style={{ marginTop: 16, animation: "badge-burst 600ms 700ms both" }}>
              <span className="chip" style={{ background: "var(--gold)", fontSize: "1rem", padding: ".5rem 1rem" }}>⭐ RANK UP! → {after.rank.name}</span>
            </div>
          )}

          {/* new badge */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, justifyContent: "center", animation: "badge-burst 600ms 900ms both" }}>
            <div className="badge" style={{ width: 78, height: 78, padding: 0, boxShadow: "var(--shadow)" }}>
              <div className="disc" style={{ width: 48, height: 48, background: "color-mix(in oklab, var(--gold) 35%, white)" }}>🎯</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: ".75rem", color: "var(--ink-soft)" }}>NEW BADGE</div>
              <div className="h-display" style={{ fontSize: "1.1rem" }}>Bullseye</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 24, gap: 12 }}>
          <button className="gbtn ghost" onClick={onTrophy}>🏆 Trophy Room</button>
          <button className="gbtn" onClick={onContinue}>Next quest →</button>
        </div>
      </div>
    </div>
  );
}
function barPct(ri, xp) {
  return ri.next ? Math.round(((xp - ri.rank.min) / (ri.next.min - ri.rank.min)) * 100) : 100;
}

/* ---------- TROPHY ROOM ---------- */
function Trophy({ player, rankInfo, onBack, onHome, settings }) {
  const earned = QUEST.EARNED[player.id];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className={"stage " + player.klass}>
      <AppBar player={player} rankInfo={rankInfo} onHome={onHome} onTrophy={() => {}} settings={settings} />
      <div className="wrap" style={{ paddingBottom: 56 }}>
        <button className="gbtn ghost sm" onClick={onBack} style={{ marginBottom: 16 }}>← Back to quests</button>

        {/* Rank track */}
        <div className="card pop-in" style={{ padding: 22, marginBottom: 22 }}>
          <h2 className="h-display" style={{ fontSize: "1.3rem", marginTop: 0 }}>Your Rank</h2>
          <div className="row" style={{ gap: 0, flexWrap: "wrap", marginTop: 10 }}>
            {QUEST.RANKS.map((r, i) => {
              const reached = rankInfo.level > i;
              const isCur = rankInfo.level === i + 1;
              return (
                <div key={r.name} className="row" style={{ gap: 0 }}>
                  <div className="col" style={{ alignItems: "center", gap: 6, width: 92 }}>
                    <div className="avatar" style={{ width: 50, height: 50, background: reached ? "var(--accent)" : "var(--bg-2)", boxShadow: isCur ? "0 0 0 4px var(--accent-soft), var(--shadow)" : "var(--shadow)" }}>
                      {reached ? <Avatar player={player} pose="happy" size={42} /> : <span style={{ fontWeight: 800, color: "var(--ink-soft)" }}>{i + 1}</span>}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: ".68rem", textAlign: "center", lineHeight: 1.1, color: reached ? "var(--ink)" : "var(--ink-soft)" }}>{r.name}</div>
                  </div>
                  {i < QUEST.RANKS.length - 1 && <div style={{ width: 24, height: 3, background: rankInfo.level > i + 1 ? "var(--accent)" : "var(--bg-2)", marginTop: -18 }} />}
                </div>
              );
            })}
          </div>
          <p style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: ".82rem", margin: "14px 0 0" }}>
            🏅 Reach <strong>Reading Legend</strong> by scoring <strong>90%+ across all 12 quests</strong>. Every quest is worth up to 100 XP — give it your best read!
          </p>
        </div>

        {/* Streak */}
        <div className="card pop-in" style={{ padding: 22, marginBottom: 22 }}>
          <div className="spread">
            <h2 className="h-display" style={{ fontSize: "1.3rem", margin: 0 }}>Practice Streak</h2>
            <span className="chip gold">🔥 {player.streak} days</span>
          </div>
          <div className="streak-days" style={{ marginTop: 14 }}>
            {days.map((d, i) => {
              const done = i < 5;
              const today = i === 5;
              return (
                <div key={i} className={"sday" + (done ? " done" : "") + (today ? " today" : "")}>
                  <span>{d}</span>
                  <span style={{ fontSize: "1rem" }}>{done ? "🔥" : today ? "⭐" : "·"}</span>
                </div>
              );
            })}
          </div>
          <p style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: ".85rem", marginBottom: 0, marginTop: 12 }}>Practice today to keep your streak alive!</p>
        </div>

        {/* Badges */}
        <h2 className="h-display" style={{ fontSize: "1.3rem", marginBottom: 12 }}>Badges <span style={{ color: "var(--ink-soft)", fontSize: "1rem" }}>· {earned.length} / {QUEST.BADGES.length}</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px,1fr))", gap: 16 }}>
          {QUEST.BADGES.map((b) => {
            const has = earned.includes(b.id);
            return (
              <div key={b.id} className={"badge" + (has ? "" : " lock")}>
                <div className="disc" style={{ background: has ? tierBg(b.tier) : "var(--bg-2)" }}>{has ? b.icon : "🔒"}</div>
                <div className="name">{b.name}</div>
                <div style={{ fontSize: ".68rem", color: "var(--ink-soft)", fontWeight: 700, lineHeight: 1.15 }}>{b.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function tierBg(tier) {
  if (tier === "gold") return "color-mix(in oklab, var(--gold) 38%, white)";
  if (tier === "silver") return "color-mix(in oklab, var(--blue) 22%, white)";
  return "color-mix(in oklab, var(--orange) 24%, white)";
}

Object.assign(window, { Home, Hub, RunnerPeek, Results, Trophy, Confetti, Stars, AppBar });
