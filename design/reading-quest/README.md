# Handoff: Reading Quest — kid-facing "arcade" glow-up for the CMAS practice app

## Overview
This package restyles the **kid-facing chrome** of the CMAS practice simulator into a friendly,
video-game-flavored experience called **"Reading Quest,"** and adds a light **gamification layer**
(XP, ranks/levels, badges, daily streak) to motivate two kids — **Olive (Grade 6)** and
**Fox (Grade 4)** — to practice daily.

**The single most important rule: the test runner stays sober.** The whole point of the app is
familiarity with the real CMAS/TestNav experience, so the in-test screens must remain plain and
calm. All the "fun" lives *around* the test: the profile picker, the quiz/mission hub, the score
reveal, and a new trophy room. Do **not** gamify the passage/item/toolbar UI.

## About the design files
The files in `design_files/` are a **design reference built in plain HTML + React-via-Babel** — a
working prototype that demonstrates the intended **look, motion, and behavior**. It is **not**
production code to copy verbatim.

Re-implement these designs in the existing app — **React 18 + TypeScript + Vite + Tailwind +
Zustand + react-router-dom**, with the Node/Express + SQLite backend — using the codebase's
established patterns. The prototype uses inline styles and a hand-rolled state machine for speed;
in the real app, use Tailwind classes / the existing CSS-variable token system, real routes, and
the Zustand stores.

Open `design_files/Reading Quest.html` in a browser to explore it. Flow:
**Home (pick player) → Mission Hub → (sober test runner) → Win celebration → Trophy Room.**
There is a ⚙️ **settings** menu (top-right) with **Day / Dusk / Night** themes and a reading-text-size
control — exercise Night mode while reading a quiz to confirm contrast.

### Prototype file map
| File | What it shows |
|---|---|
| `Reading Quest.html` | Entry point; loads the others. |
| `styles.css` | The complete **design system** — tokens, fonts, component classes, themes, animations. Source of truth for visual values. |
| `mascot.jsx` | Avatar/guide art loader (uses the PNGs in `assets/`). |
| `screens.jsx` | All screens: `Home`, `Hub`, `RunnerPeek` (sober), `Results`, `Trophy`, `AppBar`, `SettingsMenu`, plus `Confetti`/`Stars`. |
| `data.js` | Mock data + the **XP economy / ranks / badges** (the real logic spec). |
| `app.jsx` | Screen routing + theme/text-size state. |
| `assets/` | The character art (PNG). See "Characters". |

## Fidelity
**High-fidelity** for the kid-facing chrome — colors, type, spacing, radii, shadows, and motion in
`styles.css` are final; match them using Tailwind + the token system.

The **runner** (`RunnerPeek` in the prototype) is a stand-in proving the test stays plain. **Keep
your existing runner UI** (`routes/Runner.tsx` + `components/runner/*` + `components/items/*`). At
most apply the new UI font + respect the theme/text-size tokens — no arcade styling inside the test.

---

## Design tokens (from `styles.css` — authoritative)
Colors are authored in **oklch** (approximate hex given as fallback).

### Palette (cool, punchy "game-HUD")
| Token | oklch | ~hex | Use |
|---|---|---|---|
| `--ink` | `oklch(0.24 0.02 260)` | `#22252c` | Text, borders, hard shadows |
| `--ink-soft` | `oklch(0.46 0.02 260)` | `#5b606b` | Secondary text |
| `--paper` | `#ffffff` | `#ffffff` | Card surfaces |
| `--bg` | `oklch(0.95 0.012 255)` | `#e9ecf2` | Page background |
| `--bg-2` | `oklch(0.89 0.02 255)` | `#d4dae6` | Grid lines / neutral fills |
| `--purple` (Olive) | `oklch(0.54 0.22 295)` | `#7b39d6` | Olive's accent |
| `--orange` (Fox) | `oklch(0.66 0.20 45)` | `#e87a2c` | Fox's accent |
| `--gold` | `oklch(0.80 0.15 85)` | `#e8a83a` | Stars, streak, gold badges |
| `--green` | `oklch(0.70 0.17 150)` | `#2da866` | Success / "done" |
| `--blue` | `oklch(0.62 0.18 250)` | `#4385dd` | Silver badges |
| `--pink` | `oklch(0.68 0.20 5)` | `#ec5f7f` | Confetti accent |
| `--accent` | per-player | — | Set to `--purple` (Olive) / `--orange` (Fox) via a wrapper class (`.player-olive` / `.player-fox`). |
| `--accent-soft` | `color-mix(--accent 16%, white)` | — | Soft accent surfaces (re-tinted dark in Night theme). |
| `--accent-ink` | `color-mix(--accent 70%, black)` | — | Accent-colored text (re-tinted light in Night theme). |

**Per-player accent:** wrap each player's screens in `.player-olive` / `.player-fox` to set
`--accent`. Everything accent-colored (buttons, XP fill, chips, NEXT tag) derives from it.

### Type (techy / "older-kid", not cutesy)
- Google Fonts: **Chakra Petch** (400/500/600/700) and **Outfit** (400–900).
- `--font-display: "Chakra Petch"` — headings, big numbers, buttons, labels. Angular, gamer-ish.
- `--font-ui: "Outfit"` — body / UI. Clean and modern.
- Register both in `tailwind.config.ts` (`fontFamily`). Keep **Georgia/serif** (`fontFamily.reading`)
  for the test passage.

### Shape & depth ("sticker" look — sharp, not bubbly)
- `--radius: 12px`, `--radius-sm: 7px`. Buttons `9px`, chips `7px`, badge tiles `9–12px`.
  **Avatar frames are rounded squares (16px), not circles** — a "gamer profile" look.
- Borders: **`3px solid var(--ink)`** on cards/buttons/avatars (2px on chips/badges).
- **Solid offset shadows** (not blurred): `--shadow: 4px 5px 0 var(--ink)`,
  `--shadow-lg: 7px 9px 0 var(--ink)`, `--shadow-press: 2px 2px 0 var(--ink)`.
- Buttons nudge on hover (`translate(-1px,-1px)` + bigger shadow), press in on active
  (`translate(3px,4px)` + small shadow). See `.gbtn`.
- Page backdrop = `--bg` with a **subtle HUD grid** (two 1px `linear-gradient`s in `--bg-2`,
  `32px` cells). See `.stage`.

### Motion
- `pop-in` (380ms springy) entrances; `float` (3.4s) bob for the celebrating guide; `confetti-fall`
  on the win screen; `badge-burst` for earned badges / rank-ups.
- Respect `prefers-reduced-motion`; entrance end-state must be the visible state. **No sound.**

---

## Characters (`assets/` + `mascot.jsx`)
The kids supplied real illustration PNGs (transparent, no watermark). The prototype loads them via
`<img>`; the helper `Avatar({player})` dispatches by id.

| File | Who | Notes |
|---|---|---|
| `assets/moose-portrait.png` | **Moose** — the guide (a professor black Lab in a tweed vest + tie + glasses) | Brand logo + welcome + coach + celebration. Rendered face-cropped (`object-fit: cover`, `object-position: center 18%`) at small sizes (logo/coach) and whole (`object-fit: contain`) at hero sizes (≥96px). |
| `assets/olive-dog.png` | **Olive's** avatar (fluffy black dog reading a book) | 1024², transparent. |
| `assets/fox-cat.png` | **Fox's** avatar (orange tabby reading a book) | 1536×1024, transparent. |

**Avatar framing:** the player photos sit in the rounded-square `.avatar` tile on a **soft light
background (`#f4f0e7`)** with `object-fit: cover`, plus a per-image `scale`/`object-position` so the
two animals read at a matching size and the orange cat doesn't blend into Fox's orange tile:
- Olive: `scale 1.04`, `object-position center 54%`
- Fox: `scale 1.12`, `object-position 44% 50%`

Use the **player's photo** wherever the player is represented (Home cards, app-bar corner, Hub hero,
Trophy rank track). Use **Moose** for the brand logo, the coach bubble, and the win celebration.

> **IMPORTANT — optimize the art for production.** The source PNGs are ~2–3 MB each. Before
> shipping, resize/compress them (e.g. ~256–512px, WebP/optimized PNG) so the kids' devices load
> fast. Bundle them as static assets in the client (`client/src/assets/` or `public/`).
>
> The prototype also contains hand-drawn SVG fallbacks in git history; the **PNGs are the chosen
> art** — do not reintroduce the SVG mascots.

---

## Screens

### 1. Home — "Who's playing today?"  (`Home` → `routes/Home.tsx`)
- Top-aligned, scrollable column on the dotted/grid `.stage`.
- Top: **Moose** welcoming (large) + display heading "Who's playing today?" + muted subtitle.
- Two large **player cards** (grid 1fr/1fr, stack on narrow widths), each wrapped in
  `.player-olive` / `.player-fox`:
  - Rounded-square **avatar tile** (108px) with the player's photo.
  - Name (display, 2rem), "Grade N".
  - Chips: **rank name** (`.chip.accent`) + **streak** (`.chip.gold`, "🔥 N").
  - **Badge shelf:** "N badges earned" label + a wrapping row of small square badge icons.
    **Earned badges only — never locked/unearned — show every earned one (no cap).** Lets each kid
    see their own and the other's badges on the front page.
  - Full-width primary button "Let's go! →".
- Below: a quiet ghost button "👪 Grown-up: see both kids' results" → parent review.

### 2. Mission Hub  (`Hub` → `routes/QuizSelect.tsx`)
- **App bar** (`AppBar`): Moose logo + "Reading Quest" (→ Home); right side: streak chip, **LV n**
  chip, "🏆 Trophies", **⚙️ settings**, player-photo avatar.
- **Hero rank panel** (card): player avatar; "Level n · {rank}"; greeting; **XP** chip; **XP bar**
  (`.bar.xp`, gold→orange) showing progress within the current rank; caption "{xpToNext} XP to
  {next rank}".
- **Coach line** (`.coach`): **Moose** (labeled "MOOSE") in a speech bubble with an encouraging,
  name-personalized line.
- "Your Quests" header + "{done} / {total} cleared" chip.
- **Quest grid** (`auto-fill minmax(240px,1fr)`): one card per quiz (your `enumerateQuizzes` output;
  "Quiz N" → "Quest N"). Banner with corner **number**, a genre **glyph**, and a small tag
  (**"NEXT"** suggested next / **"✓ DONE"** completed). Body: genre label, **title**, and either
  **star rating + "Play again ↻"** (done) or **"▶ Start quest"**.
- **CRITICAL — NO locking.** Every quest is always playable in any order. There is **no** "complete
  the previous to unlock" gating. "NEXT" is only a soft suggestion.

> **Genre glyphs:** the prototype uses emoji placeholders. Prefer a small curated icon map keyed off
> passage `genre`/`kind`.

### 3. Test runner  (`RunnerPeek` is only a stand-in)
**Keep the existing runner.** The prototype shows a deliberately plain split view with a banner
"Test view — kept plain on purpose." Critically, the runner is forced to a **fixed bright-white
surface regardless of the app theme** (see Night-mode notes) so the passage is always readable.

### 4. Win celebration  (`Results` → post-submit / `routes/Results.tsx` flow)
- **Confetti** on mount; **Moose** celebrating; "Quest Complete!"; quiz title.
- Result card: animated **star rating**, big **score** ("6 / 6"), encouraging line.
- **XP gained** chip ("+100 XP") + an **XP bar that animates** old→new fill.
- Rank crossed → **"⭐ RANK UP! → {rank}"** burst. Badge earned → **"NEW BADGE"** burst.
- Buttons: "🏆 Trophy Room" and "Next quest →".
- Correct answers / rationales appear only on the existing results/review screens — never in the
  celebration or during an attempt.

### 5. Trophy Room  (`Trophy` → new route, e.g. `/profile/:id/trophies`)
- **Rank track:** 5 ranks as a path; reached ranks show the player avatar on an accent tile, the
  current highlighted, future greyed. Caption: *"Reach Reading Legend by scoring 90%+ across all 12
  quests. Every quest is worth up to 100 XP."*
- **Practice streak:** 7-day strip; done days flame-filled, today highlighted; "🔥 N days".
- **Badges grid:** **all** badges (earned in color, unearned greyed + 🔒), each with name + desc.

### 6. Parent review  (`ParentReview` → `routes/ParentReview.tsx`)
Lightly restyled, calm list of both kids' results with score + date.

---

## Gamification spec (the real logic — see `data.js`)

### XP economy (tuned to the real content)
Counted from `cmas-content.json` on `main`:
- **Fox (g4-form-a):** 12 quizzes, **49** auto-scorable points, 23 writing items.
- **Olive (g6-form-a):** 12 quizzes, **53** auto-scorable points, 23 writing items.

The kids have **different question counts**, so XP must **not** be "per correct answer." Instead:

> **Each quiz is worth up to 100 XP, scaled by % correct on its auto-scored items.**
> `quizXp = round(clamp(fractionCorrect, 0..1) * 100)`.
> A writing-only quiz (no auto-scored items) awards its 100 on completion.

Both kids have 12 quizzes, so for both: ceiling = **1,200 XP** (perfect run), and **90% across all
12 = 1,080 XP** = the top rank. Store each quiz's **best** result; total XP = sum of best quizXp.

### Ranks
```
Word Pup       min 0
Page Tracker   min 250
Story Scout    min 500
Chapter Champ  min 800
Reading Legend min 1080   ← 90% across all 12
```
`rankFor(xp)` → `{ rank, next, level }` (level = index+1).

### Badges (`BADGES` in `data.js`) — 15, pet-treat / toy themed
`tier` drives disc color (bronze = orange-tint, silver = blue-tint, gold = gold-tint). Earn rules
are the intent — wire to real events.

| id | name | icon | tier | Earn when |
|---|---|---|---|---|
| `first` | First Paw | 🐾 | bronze | Finish your first quiz |
| `perfect` | Bullseye | 🎯 | gold | Score 100% on a quiz |
| `streak3` | On a Roll | 🔥 | silver | 3-day streak |
| `streak7` | Week Streak | 📅 | gold | 7-day streak |
| `evidence` | Detective | 🔍 | silver | `evidence_select` item fully correct |
| `nomiss` | Sharp Reader | ⚡ | silver | Finish a quiz with no skipped items |
| `ten` | Ten Quests | 🏕️ | gold | Complete 10 quizzes |
| `legend` | Reading Legend | 👑 | gold | Reach the top rank (1080 XP) |
| `w50` | Cookie Writer | 🍪 | bronze | Write **50+** words in a response |
| `w100` | Big Bone | 🦴 | silver | Write **100+** words in a response |
| `w200` | Steak Master | 🥩 | gold | Write **200+** words in a response |
| `fetch` | Fetch Champ | 🎾 | silver | Clear 5 science quizzes |
| `yarn` | Yarn Master | 🧶 | silver | Clear 5 story quizzes |
| `fish` | Big Catch | 🐟 | bronze | `multiple_select` item fully correct |
| `mouse` | Mouse Hunter | 🐭 | bronze | Beat a timed quiz |

Word-count badges count words in the `short_response`/`prose_response` text on submit (effort, not
grading).

### Streak
Increment when a kid completes ≥1 quiz on a new calendar day; reset on a missed day. Track
`lastActiveDate` + `streakCount` per profile.

---

## State & persistence (backend work required)
The visuals are front-end only, but **XP/ranks/badges/streak are a real feature** needing server
persistence (the app is source of truth — `PROJECT.md §3/§11`).

- **Client (Zustand):** new `progress` store (total XP, per-quiz best XP, earned badge ids, streak)
  + `lib/progress.ts` (`quizXp`, `RANKS`, `rankFor`, `BADGES`, badge-evaluation helpers). Reuse the
  existing `store/settings.ts` for the theme + text-size menu — don't add new theme state.
- **Server / API (extend `server/src`, SQLite at `/data/cmas.db`):**
  - Persist progress per profile (extend per-profile state, or add a `progress` table:
    `{ totalXp, bestByQuiz: {quizId: xp}, badges: [...], streakCount, lastActiveDate }`).
  - Recompute on result save (you already have `POST /api/results/:profile`). Add
    `GET /api/progress/:profile` (or fold into the results POST so the server recomputes).
  - Last-write-wins per profile (each kid writes only their own). No new third-party calls.

---

## Settings menu (theme + reading size)
The ⚙️ gear opens a popover with **Color theme** (Day / Dusk / Night) and **Reading text size**
(A- / A / A+ / A++ → `--passage-size` 16/18/21/24px). Map onto the **existing** Settings concepts
(`routes/Settings.tsx` / `store/settings.ts`) — implement the gear as a quick-access surface to that
same store, don't duplicate state. Theme classes `body.theme-dusk` / `body.theme-night` override the
CSS-variable tokens.

### Night-mode correctness (carry these fixes over)
1. **The runner is always a light "real exam" surface** regardless of theme. In the prototype
   `.card.sober` forces white bg + dark text + neutral borders. Do the same — the passage must never
   be dark-on-dark.
2. **Buttons must inherit text color** (`button { color: inherit }`). Card/quest "buttons" hold
   names/titles/numbers; native buttons default to black and would render black-on-dark in Night.
3. **Gold/green chips and streak-day tiles keep fixed dark text** (their backgrounds are always
   light). **Soft accent surfaces** switch to a dark tint in Night.
4. Stars use a thin stroke (1.5) + `overflow: visible` so they aren't clipped.

---

## Repo file map
| Prototype | Real repo target |
|---|---|
| `styles.css` tokens/fonts/components | `client/src/index.css` (extend the token system) + `client/tailwind.config.ts` (add Chakra Petch / Outfit) |
| `Home` | `client/src/routes/Home.tsx` |
| `Hub` | `client/src/routes/QuizSelect.tsx` |
| `Results` (celebration) | post-submit flow + `client/src/routes/Results.tsx` (keep `ResultDetail.tsx` for answer breakdown) |
| `Trophy` | **new** `client/src/routes/Trophy.tsx` (register in `App.tsx`) |
| `ParentReview` | `client/src/routes/ParentReview.tsx` (light restyle) |
| `AppBar` / `SettingsMenu` | **new** `client/src/components/AppBar.tsx`, reuse `store/settings.ts` |
| `mascot.jsx` + `assets/*.png` | **new** `client/src/components/Avatar.tsx` + optimized art in `client/src/assets/` |
| `data.js` XP/ranks/badges | **new** `client/src/lib/progress.ts` (+ Zustand `store/progress.ts`) |
| `RunnerPeek` | **do not port** — keep existing `routes/Runner.tsx` + `components/runner/*` |

Keep the footer: *"Independent practice tool. Not affiliated with Pearson, TestNav, CDE, or CMAS."*

---

## Acceptance checklist
- [ ] Home shows Olive (black dog) + Fox (orange cat) photos with accent color, rank, streak, and an
      **earned-only** badge shelf; Moose welcomes them.
- [ ] Per-player accent applies app-wide (Olive purple / Fox orange) via one wrapper class.
- [ ] Hub lists all 12 quizzes, **all playable any order (no locks)**, stars on completed; XP + rank
      correct.
- [ ] XP uses the **100-per-quiz, %-scaled** model; top rank reachable by both kids at ~90% across
      all 12; total = sum of best per quiz.
- [ ] 15 badges earn on the right events (incl. word-count 50/100/200); Trophy shows all, Home shows
      earned only.
- [ ] Streak increments daily / resets on a miss.
- [ ] Win celebration: confetti, animated stars + XP bar, rank-up + new-badge bursts.
- [ ] Themes (Day/Dusk/Night) + reading size work and are **readable in all themes** (no dark-on-dark
      anywhere; runner stays light); wired to the existing settings store.
- [ ] **Runner stays sober** — no arcade styling inside the active test.
- [ ] Avatar art optimized/compressed; progress persists per profile on the server.
- [ ] Reduced-motion respected; no audio.

## Fonts to add
Google Fonts: **Chakra Petch** (400,500,600,700) and **Outfit** (400–900). Add `@import`/`<link>` +
register in `tailwind.config.ts`. Keep **Georgia/serif** for the test passage.
