import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "default" | "cream" | "dark" | "yellow-on-black";
export type TextSize = "s" | "m" | "l" | "xl";

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
      theme: "default",
      textSize: "m",
      lineReader: false,
      spellCheck: true,
      timerEnabled: false,
      timerMinutes: 45,
      tutorialSeen: false,
      setTheme: (t) => set({ theme: t }),
      setTextSize: (s) => set({ textSize: s }),
      setLineReader: (b) => set({ lineReader: b }),
      setSpellCheck: (b) => set({ spellCheck: b }),
      setTimerEnabled: (b) => set({ timerEnabled: b }),
      setTimerMinutes: (m) => set({ timerMinutes: m }),
      markTutorialSeen: () => set({ tutorialSeen: true }),
      resetTutorial: () => set({ tutorialSeen: false }),
    }),
    { name: "cmas.settings.v1" },
  ),
);
