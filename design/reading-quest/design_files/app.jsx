/* global React, ReactDOM, QUEST, Home, Hub, RunnerPeek, Results, Trophy, Scout */
const { useState } = React;

function ParentReview({ onHome }) {
  const rows = [
    { kid: "Olive", quiz: "The Last Day of Summer", score: "6 / 6", when: "Today" },
    { kid: "Olive", quiz: "Why the Ocean Glows", score: "5 / 6", when: "Yesterday" },
    { kid: "Fox", quiz: "The Bird That Never Stops", score: "5 / 5", when: "Today" },
    { kid: "Fox", quiz: "The Mixed-Up Lunchbox", score: "3 / 4", when: "2 days ago" },
  ];
  return (
    <div className="stage">
      <div className="appbar wrap">
        <button className="brandmark" onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}>
          <span className="logo" style={{ background: "var(--ink)" }}><Scout pose="idle" size={30} /></span>Reading Quest
        </button>
        <span className="chip">Grown-up view</span>
      </div>
      <div className="wrap" style={{ paddingBottom: 50 }}>
        <h1 className="h-display" style={{ fontSize: "1.8rem" }}>Both kids' results</h1>
        <p style={{ fontWeight: 700, color: "var(--ink-soft)", marginTop: 0 }}>Calm, plain summary — written tasks need your scoring.</p>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rows.map((r, i) => (
            <div key={i} className="spread" style={{ padding: "14px 18px", borderTop: i ? "2px solid var(--bg-2)" : "none" }}>
              <div className="row" style={{ gap: 12 }}>
                <span className={"chip " + (r.kid === "Olive" ? "accent" : "gold")} style={{ minWidth: 58, justifyContent: "center" }}>{r.kid}</span>
                <div>
                  <div style={{ fontWeight: 800 }}>{r.quiz}</div>
                  <div style={{ fontSize: ".8rem", color: "var(--ink-soft)", fontWeight: 700 }}>{r.when}</div>
                </div>
              </div>
              <div className="h-display" style={{ fontSize: "1.2rem" }}>{r.score}</div>
            </div>
          ))}
        </div>
        <button className="gbtn ghost sm" style={{ marginTop: 18 }} onClick={onHome}>← Back home</button>
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState("home"); // home | hub | runner | results | trophy | parent
  const [playerId, setPlayerId] = useState(null);
  const [theme, setTheme] = useState("day");
  const [textSize, setTextSize] = useState("m");

  React.useEffect(() => {
    document.body.className = theme === "day" ? "" : "theme-" + theme;
    document.body.dataset.textSize = textSize;
  }, [theme, textSize]);

  const settings = { theme, textSize, setTheme, setTextSize };

  const player = playerId && QUEST.PLAYERS[playerId] ? QUEST.PLAYERS[playerId] : null;
  const rankInfo = player ? QUEST.rankFor(player.xp) : null;

  function pick(id) {
    if (id === "parent") { setScreen("parent"); return; }
    setPlayerId(id);
    setScreen("hub");
  }
  function home() { setScreen("home"); }

  if (screen === "home") return <Home onPick={pick} />;
  if (screen === "parent") return <ParentReview onHome={home} />;
  if (!player) return <Home onPick={pick} />;

  if (screen === "hub")
    return <Hub player={player} rankInfo={rankInfo} onHome={home} settings={settings}
      onStart={() => setScreen("runner")} onTrophy={() => setScreen("trophy")} />;
  if (screen === "runner")
    return <RunnerPeek player={player} rankInfo={rankInfo} onHome={() => setScreen("hub")} settings={settings}
      onFinish={() => setScreen("results")} />;
  if (screen === "results")
    return <Results player={player} rankInfo={rankInfo} onHome={home} settings={settings}
      onContinue={() => setScreen("hub")} onTrophy={() => setScreen("trophy")} />;
  if (screen === "trophy")
    return <Trophy player={player} rankInfo={rankInfo} onHome={home} settings={settings} onBack={() => setScreen("hub")} />;
  return <Home onPick={pick} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
