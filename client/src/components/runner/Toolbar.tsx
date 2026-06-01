import { useToolsStore, type HighlightColor } from "@/store/tools";
import { useSettingsStore, type TextSize, type ThemeName } from "@/store/settings";
import { useSessionStore } from "@/store/session";
import type { Item } from "@/content/schema";

const COLORS: Array<{ id: HighlightColor; label: string; cls: string }> = [
  { id: "yellow", label: "Yellow", cls: "hl-yellow" },
  { id: "pink", label: "Pink", cls: "hl-pink" },
  { id: "blue", label: "Blue", cls: "hl-blue" },
  { id: "green", label: "Green", cls: "hl-green" },
];

const SIZES: TextSize[] = ["s", "m", "l", "xl"];
const THEMES: Array<{ id: ThemeName; label: string }> = [
  { id: "default", label: "Default" },
  { id: "cream", label: "Cream" },
  { id: "dark", label: "Dark" },
  { id: "yellow-on-black", label: "Yellow/Black" },
];

interface Props {
  currentItem: Item;
}

export default function Toolbar({ currentItem }: Props) {
  const tools = useToolsStore();
  const settings = useSettingsStore();
  const session = useSessionStore();
  const masked = session.state?.masked[currentItem.id] ?? false;

  const showEliminator = currentItem.type === "multiple_choice" ||
    currentItem.type === "multiple_select" ||
    currentItem.type === "two_part_ebsr";

  return (
    <div className="border-b border-border bg-paper">
      <div className="flex items-center gap-1 px-3 py-2 flex-wrap">
        <ToolBtn
          icon="▶"
          label="Pointer"
          pressed={tools.mode === "pointer"}
          onClick={() => tools.setMode("pointer")}
        />
        <div className="flex items-center gap-0.5">
          <ToolBtn
            icon="✎"
            label="Highlighter"
            pressed={tools.mode === "highlighter"}
            onClick={() =>
              tools.setMode(
                tools.mode === "highlighter" ? "pointer" : "highlighter",
              )
            }
          />
          {tools.mode === "highlighter" && (
            <div
              role="group"
              aria-label="Highlight color"
              className="flex items-center gap-1 ml-1"
            >
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  aria-label={c.label}
                  aria-pressed={tools.highlightColor === c.id}
                  className={`w-5 h-5 rounded-full border ${c.cls}`}
                  style={{
                    borderColor:
                      tools.highlightColor === c.id
                        ? "var(--color-ink)"
                        : "var(--color-border)",
                    borderWidth: tools.highlightColor === c.id ? 2 : 1,
                  }}
                  onClick={() => tools.setHighlightColor(c.id)}
                />
              ))}
            </div>
          )}
        </div>

        {showEliminator && (
          <ToolBtn
            icon="⊘"
            label="Eliminator"
            pressed={false}
            onClick={() => {
              alert(
                "Eliminator: click any answer choice once to cross it out, click again to restore.",
              );
            }}
            title="Cross out answer choices"
          />
        )}

        {showEliminator && (
          <ToolBtn
            icon={masked ? "👁" : "🙈"}
            label="Mask"
            pressed={masked}
            onClick={() => session.setMasked(currentItem.id, !masked)}
            title="Hide all answer choices; click the eye on each to reveal"
          />
        )}

        <ToolBtn
          icon="📓"
          label="Notepad"
          pressed={tools.notepadOpen}
          onClick={() => tools.toggleNotepad()}
        />

        <ToolBtn
          icon="≡"
          label="Line Reader"
          pressed={settings.lineReader}
          onClick={() => settings.setLineReader(!settings.lineReader)}
        />

        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
          <span className="text-xs text-muted font-ui mr-1">Aa</span>
          {SIZES.map((s) => (
            <button
              key={s}
              className="tool-btn"
              aria-pressed={settings.textSize === s}
              onClick={() => settings.setTextSize(s)}
              style={{ minWidth: 28, padding: "2px 6px" }}
            >
              <span style={{ fontSize: s === "s" ? 10 : s === "m" ? 13 : s === "l" ? 16 : 19 }}>
                A
              </span>
            </button>
          ))}
        </div>

        <div className="ml-2 pl-2 border-l border-border">
          <select
            className="border border-border rounded px-2 py-1 text-sm bg-paper text-ink"
            value={settings.theme}
            onChange={(e) => settings.setTheme(e.target.value as ThemeName)}
            aria-label="Color theme"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ToolBtn
            icon="?"
            label="Tutorial"
            pressed={tools.tutorialOpen}
            onClick={() => tools.setTutorial(!tools.tutorialOpen)}
          />
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  icon,
  label,
  pressed,
  onClick,
  title,
}: {
  icon: string;
  label: string;
  pressed: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className="tool-btn"
      aria-pressed={pressed}
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
    >
      <span className="icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
