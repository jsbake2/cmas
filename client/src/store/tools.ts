import { create } from "zustand";

export type ToolMode = "pointer" | "highlighter";
export type HighlightColor = "yellow" | "pink" | "blue" | "green";

interface ToolsState {
  mode: ToolMode;
  highlightColor: HighlightColor;
  notepadOpen: boolean;
  tutorialOpen: boolean;
  setMode: (m: ToolMode) => void;
  setHighlightColor: (c: HighlightColor) => void;
  toggleNotepad: () => void;
  setNotepad: (b: boolean) => void;
  setTutorial: (b: boolean) => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  mode: "pointer",
  highlightColor: "yellow",
  notepadOpen: false,
  tutorialOpen: false,
  setMode: (m) => set({ mode: m }),
  setHighlightColor: (c) => set({ highlightColor: c, mode: "highlighter" }),
  toggleNotepad: () => set((s) => ({ notepadOpen: !s.notepadOpen })),
  setNotepad: (b) => set({ notepadOpen: b }),
  setTutorial: (b) => set({ tutorialOpen: b }),
}));
