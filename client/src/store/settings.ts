import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "day" | "dusk" | "night";
export type TextSize = "s" | "m" | "l" | "xl";

/** Map any legacy persisted theme name onto the new Day/Dusk/Night set. */
function normalizeTheme(t: unknown): ThemeName {
  switch (t) {
    case "day":
    case "dusk":
    case "night":
      return t;
    case "cream":
      return "dusk";
    case "dark":
    case "yellow-on-black":
      return "night";
    default:
      return "day";
  }
}

interface SettingsState {
  theme: ThemeName;
  textSize: TextSize;
  lineReader: boolean;
  spellCheck: boolean;
  timerEnabled: boolean;
  timerMinutes: number;
  tutorialSeen: boolean;
  setTheme: (t: ThemeName) => void;
  setTextSize: (s: TextSize) => void;
  setLineReader: (b: boolean) => void;
  setSpellCheck: (b: boolean) => void;
  setTimerEnabled: (b: boolean) => void;
  setTimerMinutes: (m: number) => void;
  markTutorialSeen: () => void;
  resetTutorial: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "day",
      textSize: "m",
      lineReader: false,
      spellCheck: true,
      timerEnabled: false,
      timerMinutes: 45,
      tutorialSeen: false,
      setTheme: (t) => set({ theme: normalizeTheme(t) }),
      setTextSize: (s) => set({ textSize: s }),
      setLineReader: (b) => set({ lineReader: b }),
      setSpellCheck: (b) => set({ spellCheck: b }),
      setTimerEnabled: (b) => set({ timerEnabled: b }),
      setTimerMinutes: (m) => set({ timerMinutes: m }),
      markTutorialSeen: () => set({ tutorialSeen: true }),
      resetTutorial: () => set({ tutorialSeen: false }),
    }),
    {
      name: "cmas.settings.v1",
      onRehydrateStorage: () => (state) => {
        if (state) state.theme = normalizeTheme(state.theme);
      },
    },
  ),
);
