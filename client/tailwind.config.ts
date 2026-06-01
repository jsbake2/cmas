import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", ".theme-dark"],
  theme: {
    extend: {
      fontFamily: {
        reading: [
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "Times",
          "serif",
        ],
        ui: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: "var(--color-ink)",
        paper: "var(--color-paper)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        border: "var(--color-border)",
        focus: "var(--color-focus)",
        highlight: {
          yellow: "var(--hl-yellow)",
          pink: "var(--hl-pink)",
          blue: "var(--hl-blue)",
          green: "var(--hl-green)",
        },
      },
      fontSize: {
        passage: "var(--passage-size)",
      },
    },
  },
  plugins: [],
} satisfies Config;
