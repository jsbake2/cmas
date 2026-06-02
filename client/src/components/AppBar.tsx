import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Moose } from "@/components/Avatar";
import {
  useSettingsStore,
  type ThemeName,
  type TextSize,
} from "@/store/settings";
import type { ProfileId, ProgressSummary } from "@/api/client";

const THEMES: Array<{ id: ThemeName; label: string; sw: string }> = [
  { id: "day", label: "Day", sw: "#eef0fb" },
  { id: "dusk", label: "Dusk", sw: "#f3ead7" },
  { id: "night", label: "Night", sw: "#1f1f29" },
];
const SIZES: Array<[TextSize, string]> = [
  ["s", "A-"],
  ["m", "A"],
  ["l", "A+"],
  ["xl", "A++"],
];

export function SettingsMenu() {
  const { theme, textSize, setTheme, setTextSize } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="settings-wrap" ref={ref}>
      <button
        className="gbtn ghost sm"
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙️
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Display settings">
          <h4>Color theme</h4>
          <div className="seg">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className="theme-swatch"
                aria-pressed={theme === t.id}
                title={t.label}
                style={{ background: t.sw }}
                onClick={() => setTheme(t.id)}
              />
            ))}
          </div>
          <h4>Reading text size</h4>
          <div className="seg">
            {SIZES.map(([id, lbl]) => (
              <button
                key={id}
                className="seg-btn"
                aria-pressed={textSize === id}
                onClick={() => setTextSize(id)}
              >
                {lbl}
              </button>
            ))}
          </div>
          <button
            className="gbtn sm"
            style={{ width: "100%" }}
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppBar({
  profile,
  summary,
  showTrophies = true,
}: {
  profile: ProfileId;
  summary?: ProgressSummary;
  showTrophies?: boolean;
}) {
  const nav = useNavigate();
  const level = summary?.rank.level ?? 1;
  const streak = summary?.streakCount ?? 0;

  return (
    <div className="appbar wrap">
      <button className="brandmark" onClick={() => nav("/")}>
        <span className="logo">
          <Moose size={30} />
        </span>
        Reading Quest
      </button>
      <div className="rq-row">
        <span className="chip gold">🔥 {streak}</span>
        <span className="chip accent" title="Your level">
          <strong style={{ fontFamily: "var(--font-display)" }}>
            LV {level}
          </strong>
        </span>
        {showTrophies && (
          <Link className="gbtn ghost sm" to={`/profile/${profile}/trophies`}>
            🏆 Trophies
          </Link>
        )}
        <SettingsMenu />
        <div className="avatar" style={{ width: 46, height: 46 }}>
          <Avatar player={profile} />
        </div>
      </div>
    </div>
  );
}
