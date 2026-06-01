import { Link, useParams } from "react-router-dom";
import { useSettingsStore, type ThemeName, type TextSize } from "@/store/settings";

const THEMES: Array<{ id: ThemeName; label: string }> = [
  { id: "default", label: "Black on white (default)" },
  { id: "cream", label: "Black on cream" },
  { id: "dark", label: "White on black" },
  { id: "yellow-on-black", label: "Yellow on black" },
];

const SIZES: Array<{ id: TextSize; label: string }> = [
  { id: "s", label: "Small" },
  { id: "m", label: "Medium" },
  { id: "l", label: "Large" },
  { id: "xl", label: "X-Large" },
];

export default function Settings() {
  const { profile } = useParams();
  const s = useSettingsStore();

  return (
    <div className="max-w-2xl w-full mx-auto p-6 space-y-6">
      <header>
        <Link to={`/profile/${profile}/quizzes`} className="text-sm text-accent underline">
          ← Back
        </Link>
        <h1 className="font-ui text-2xl font-semibold mt-2">Settings</h1>
        <p className="text-muted text-sm">
          These apply to the practice session. Tools remain togglable during the test.
        </p>
      </header>

      <Section title="Color contrast">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                checked={s.theme === t.id}
                onChange={() => s.setTheme(t.id)}
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Text size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((sz) => (
            <button
              key={sz.id}
              className="btn"
              aria-pressed={s.textSize === sz.id}
              onClick={() => s.setTextSize(sz.id)}
              style={
                s.textSize === sz.id
                  ? {
                      background: "var(--color-accent-soft)",
                      borderColor: "var(--color-accent)",
                    }
                  : {}
              }
            >
              {sz.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tools">
        <Toggle
          label="Line reader (overlay)"
          on={s.lineReader}
          onChange={s.setLineReader}
        />
        <Toggle
          label="Spell check in writing items"
          on={s.spellCheck}
          onChange={s.setSpellCheck}
        />
      </Section>

      <Section title="Timer">
        <Toggle
          label="Enable countdown timer"
          on={s.timerEnabled}
          onChange={s.setTimerEnabled}
        />
        {s.timerEnabled && (
          <label className="flex items-center gap-2 mt-2">
            <span>Minutes:</span>
            <input
              type="number"
              min={1}
              max={180}
              value={s.timerMinutes}
              onChange={(e) =>
                s.setTimerMinutes(Math.max(1, Number(e.target.value)))
              }
              className="border border-border rounded px-2 py-1 w-20"
            />
          </label>
        )}
      </Section>

      <Section title="Tutorial">
        <button className="btn" onClick={s.resetTutorial}>
          Show tutorial next time the test starts
        </button>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <h2 className="font-ui font-semibold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span>{label}</span>
    </label>
  );
}
