# PROJECT.md — CMAS Practice Simulator ("TestNav-style" ELA practice)

> **Purpose of this file:** This is a strict build specification for Claude Code. Build the application described here. Do not deviate from the **MUST** requirements. Where this document says **SHOULD**, prefer the stated approach but use judgment. Where it says **MAY**, it is optional.

---

## 1. Summary

Build a **self-hosted, containerized web application** that lets two children run **CMAS-style English Language Arts practice sessions**. The goal is **familiarity with the digital testing experience and tools** that Colorado's CMAS assessment uses (delivered on Pearson's TestNav platform), so the interface is not new to the kids on test day.

This app is the **digital-tools half** of a two-part study plan (the other half is paper worksheets). It focuses on: navigating a computer-based test, using on-screen tools (highlighter, answer eliminator, notepad, line reader, etc.), and answering the CMAS item types.

All reading passages, questions, answer keys, and writing prompts are supplied in **`cmas-content.json`** (delivered with this file). The app is **data-driven**: it renders whatever is in that file. Do not hard-code content into components.

### Key deployment facts (see §4 for detail)
- **Served, not static.** It runs as a containerized service (frontend + small backend), not a static bundle the user opens locally.
- **Host:** the user's home server at **`10.0.0.16`**.
- **Access:** **`http://10.0.0.16:8473`** on the home LAN (`10.0.0.0/24`), and **`https://cmas.jsb-emr.us`** publicly via a **Cloudflare Tunnel** gated by **Cloudflare Access** (allow-list: `jason.shawn.baker@gmail.com` only). No router port-forwarding — the tunnel is outbound from the home server. The application itself still has no built-in auth; identity is enforced at the Cloudflare Access edge.
- **Two children use it at the same time, on separate devices.** A profile selector picks who is using it: **Olive (6th grade)** and **Fox (4th grade)**.
- **Containerized** (Docker + Compose) to sit alongside the user's other services on that server, with persistent data in a mounted volume.

### Non-affiliation / originality (MUST)
- This is an **independent, unofficial** practice tool for personal/home use. It is **not** affiliated with, endorsed by, or connected to Pearson, TestNav, the Colorado Department of Education, or CMAS.
- **MUST NOT** copy or embed Pearson/TestNav/CMAS logos, trademarks, proprietary CSS, screenshots, or official test content. Build an original look that is *functionally* similar ("TestNav-style"), not a clone of their branding.
- All content comes from the provided original `cmas-content.json`. Do not scrape or import real test items.
- Footer line in the app: *"Independent practice tool. Not affiliated with Pearson, TestNav, CDE, or CMAS."*

---

## 2. Users & profiles (MUST)

- Exactly **two built-in profiles**, shown on the start screen as large, kid-friendly buttons:
  - **Olive** → **Grade 6** → loads form `g6-form-a`.
  - **Fox** → **Grade 4** → loads form `g4-form-a`.
- No login, no passwords, no PII — selecting a name is the whole "auth." (Profiles **MAY** be defined in a small config so more could be added later, but ship with exactly these two mapped as above.)
- **Concurrent use:** both children use the app **at the same time from different devices** on the LAN. Each child selects their own profile; the backend stores each profile's progress and results **separately**, so simultaneous use never collides. A child only ever reads/writes their own profile's data.
- **Operator:** a parent. Provide a simple way for the parent to review **both** children's saved results (see §9).
- Runs in a normal desktop/laptop/tablet browser (current Chrome/Edge/Firefox/Safari). Tablet landscape **SHOULD** work. Phone layout is out of scope.

---

## 3. Architecture & tech stack (MUST unless noted)

A single container running a **small backend server that serves the built frontend and a tiny persistence API.**

- **Frontend:** React 18 + TypeScript + **Vite** + Tailwind CSS. State via React context or a small store (Zustand **SHOULD** be used). Routing via `react-router-dom`.
- **Backend:** a small **Node + TypeScript** server (Express or Fastify). Its jobs:
  1. Serve the built frontend (`dist/`) as static assets.
  2. Serve the content file at `GET /api/content`.
  3. Provide a small persistence API (§11) for per-profile in-progress state and completed results.
  4. Expose `GET /api/health` for the container healthcheck.
- **Persistence:** server-side, in a **mounted volume at `/data`**. Use **SQLite** (`better-sqlite3`) at `/data/cmas.db` (**SHOULD**); a JSON file via a small lib (e.g., lowdb) **MAY** be used instead. The server is the source of truth. The client **MAY** keep a localStorage cache for resilience, but persisted progress/results live on the server so they survive container restarts and are visible to the parent from any device.
- **No external database service, no cloud, no third-party network calls at runtime.** Everything runs inside the one container against the local volume.
- Keep dependencies minimal. A drag-and-drop lib (e.g. `@dnd-kit/core`) **MAY** be used for ordering items.
- The server **MUST** listen on `0.0.0.0` inside the container on the configured `PORT` so it is reachable when the port is published.

---

## 4. Deployment & hosting (MUST)

- **Containerize with Docker**, orchestrated by **`docker-compose.yml`**, so it runs next to the user's other containerized services on the server.
- **Host server:** `10.0.0.16`. **Port:** **`8473`** (configurable via the `PORT` env var and the compose port mapping; change only if 8473 is already taken on that host).
- **Access URL:** `http://10.0.0.16:8473`.
- **LAN exposure (MUST):**
  - Publish the port so devices on `10.0.0.0/24` can reach it. The default compose mapping `"8473:8473"` publishes on all host interfaces, which makes `http://10.0.0.16:8473` reachable from the LAN.
  - To restrict strictly to the LAN interface, bind the mapping to the server's LAN IP: `"10.0.0.16:8473:8473"`. Document both options in the README.
  - **MUST NOT** open the LAN port (`8473`) to the public via router port-forwarding. Public access is only via the Cloudflare Tunnel below.
- **Public exposure (MUST):**
  - A **Cloudflare Tunnel** (`cloudflared`) sidecar container connects outbound from the host to Cloudflare and routes `https://cmas.jsb-emr.us` to the app's `http://localhost:8473`. No inbound ports on the home router.
  - A **Cloudflare Access** policy on the `cmas.jsb-emr.us` application restricts to `jason.shawn.baker@gmail.com` (one-time PIN identity provider). All public requests are authenticated at the edge before reaching the app.
  - The `cloudflared` token (per-tunnel JWT, not an account API key) is provided via env var `TUNNEL_TOKEN` and is **never** committed to the repo. The compose file reads it from `${TUNNEL_TOKEN}`; document `.env` usage and that the env file is gitignored.
  - The README documents how to enroll the tunnel, set the Access policy, and rotate the tunnel token.
- **Container requirements:**
  - Multi-stage `Dockerfile`: stage 1 builds the frontend (`vite build`); stage 2 is a slim Node runtime that runs the server and serves `dist/` + the API.
  - `docker-compose.yml` **MUST** include: the `8473` port mapping, a **named volume mounted at `/data`** for the SQLite/JSON store, `restart: unless-stopped`, a `healthcheck` against `/api/health`, and `PORT` via environment.
  - The container runs as a non-root user where practical.
- **Bring-up:** `docker compose up -d --build`. The README documents this, how to change the port, how to back up the `/data` volume, and how to update content (replace/remount `cmas-content.json`).

---

## 5. Screens & flow (MUST)

1. **Home / "Who's practicing?"** — two big buttons: **Olive (Grade 6)** and **Fox (Grade 4)**. Selecting one loads that profile and its form, and shows any saved/in-progress session ("Resume") plus past results for that child.
2. **Settings (pre-test)** — mirrors TestNav's practice "Settings" page. The operator can pre-enable tools/accessibility options for the session: color-contrast theme, text size, line reader on/off, spell-check on/off, timer on/off (+ minutes). These become session defaults; tools remain toggleable during the test.
3. **Form / Unit select** — a form has one or more **units**; a unit has one or more **sections**; a section is **one passage + its items**. Allow starting a full unit or a single section.
4. **Tutorial overlay (first run)** — a self-guided, dismissible tour (Next/Back) of the toolbar and tools, mirroring TestNav's startup tutorial. Relaunchable from the tools/help menu.
5. **Test runner** — the core screen (§6).
6. **Review screen** — grid/list of every item in the unit with status: *answered*, *not answered*, *flagged*. Jump to any item. **Submit** with a confirmation dialog.
7. **Results** — per §9.

Navigation between items: **Back** and **Next** buttons plus an item-navigation strip showing answered/flagged indicators. The student can move freely within a unit before submitting.

---

## 6. Test runner layout (MUST)

- **Two-panel split:** passage on the **left** (≈55% width, independently scrollable), the current **item on the right** (≈45%, scrollable). A draggable divider **SHOULD** allow resizing.
- **Passage panel:**
  - Renders the passage with **numbered paragraphs** shown as `[1] [2] …` (numbering from paragraph order in the data).
  - Supports **multi-passage** tasks via **tabs** (the data model allows a section to reference more than one passage; current content uses one, but build for tabs).
  - Passage text **MUST** be selectable for the highlighter and rendered so individual **sentences are addressable** for hot-text/evidence-select items (§7).
- **Top toolbar:** the tools in §8, as icon buttons with tooltips and keyboard access.
- **Bottom bar:** Back · item progress ("Item 3 of 12") · Flag-for-review toggle · Next · Review.
- **Header:** unit title, the current profile (Olive/Fox), and the timer if enabled.

Keep the chrome minimal and the reading area generous. Passage body ~18px default, adjustable by the text-size tool.

---

## 7. Item types (MUST support all)

Each item's `type` field selects the renderer:

1. **`multiple_choice`** — single correct answer; radio selection.
2. **`multiple_select`** — choose N correct options (checkboxes). Support partial credit (§9).
3. **`two_part_ebsr`** — Evidence-Based Selected Response. **Part A** (multiple-choice) and **Part B** ("Which detail best supports your answer to Part A?", multiple-choice), stacked. Score A and B independently.
4. **`evidence_select`** (hot text) — student selects one or more **sentences within the passage** (optionally limited to a paragraph via `paragraphScope`). Selectable sentences highlight on hover and toggle on click. Correct = exact match of the selected sentence set.
5. **`order`** (drag to sequence) — drag steps/events into the correct order. Score by exact sequence (partial credit optional).
6. **`inline_dropdown`** (cloze) — a sentence with one or more inline `<select>` dropdowns to set correctly.
7. **`short_response`** — small free-text area (a few sentences). **Not auto-scored.** Spell-check toggle applies. Show `requireCitation` guidance when true. Compare against `sampleAnswer` at results time.
8. **`prose_response`** — large free-text essay area. **Not auto-scored.** Has `taskType` (`narrative`, `research_simulation`, `literary_analysis`), an optional word-count hint, a spell-check toggle, and a rubric for parent scoring. Show source passage(s) while writing.

After submission the app **MUST** be able to show the correct answer and `rationale`/`sampleAnswer` (in Results/review only — never during the active attempt).

---

## 8. On-screen tools — TestNav-style (MUST implement 8.1–8.11)

Behavior matters more than pixel-matching.

1. **Pointer** — default; deselects other tool modes.
2. **Highlighter** — selecting text pops a small color menu (at least **yellow, pink, blue, green**); applying colors the selection; a **clear** option removes it. **Highlights persist per passage** across all its items and are saved (per profile).
3. **Answer eliminator** — toggle a mode where clicking a choice **strikes it through** (stays visible, marked); clicking again restores it. Per item, persisted.
4. **Answer masking** — hide all choices; each has an **eye icon** to reveal/hide individually.
5. **Notepad / scratchpad** — movable notes panel; notes kept **per passage** and persisting as the student navigates that passage's items.
6. **Line reader** — movable, resizable overlay that masks all but a band of lines. Toggle on/off.
7. **Magnifier / zoom** — at minimum a global text-size control (S/M/L/XL); a draggable magnifier is **SHOULD**.
8. **Contrast / color themes** — default (black on white) plus high-contrast options (e.g., black on cream, white on black, yellow on black). Applies app-wide; persists.
9. **Spell check** — inside `short_response` and `prose_response` only; toggle on/off; **SHOULD** show misspellings with a red underline (the native textarea spellcheck is acceptable).
10. **Flag for review** — per-item flag, shown in the item-nav strip and Review screen.
11. **Tutorial / Help menu** — relaunch the tutorial; open Settings.

**Timer** — optional per-unit countdown (configurable minutes; off by default; available to simulate timed conditions). At zero, prompt to review/submit; do **not** hard-lock the child out (this is practice).

---

## 9. Scoring & results (MUST)

- **Auto-score** objective items: `multiple_choice`, `multiple_select` (partial credit = fraction correct with no incorrect selections, configurable), `two_part_ebsr` (A and B each a point), `evidence_select` (exact set match), `order` (exact sequence; partial optional), `inline_dropdown` (per blank).
- **Do NOT auto-score** `short_response` or `prose_response`. On the Results screen: show the child's response, the `sampleAnswer`/`sampleResponse` and rubric, and a **parent-scoring control** (0…`rubricMax`) folded into the summary.
- **Results screen:** overall objective score, per-item breakdown (correct/incorrect, the correct answer, the `rationale`), a **by-skill summary** (group items by `skill`), and the written responses with sample/rubric for manual scoring.
- **Persistence (server-side, per profile):** completed sessions are saved to the backend store and listed in that child's history; allow re-opening past results and a clean **retake** that clears prior responses for that form.
- **Parent review:** provide a simple parent view (e.g., a `/review` route or a toggle) that lists results for **both** Olive and Fox, reading from the backend, so the parent can check progress from any device on the LAN.
- Never reveal answers, rationales, or samples during an active attempt — only in Results/review.

---

## 10. Content data contract (`cmas-content.json`)

The app is driven entirely by this file (served at `GET /api/content`). Treat it as the **source of truth** and write a **Zod schema** that matches it exactly; fail loudly on mismatch.

```jsonc
{
  "version": "1.0",
  "forms": [
    {
      "id": "g4-form-a",
      "grade": 4,
      "title": "Grade 4 Practice Form A",
      "units": [
        {
          "id": "g4-u1",
          "title": "Unit 1",
          "timeLimitMinutes": null,            // null = untimed
          "sections": [
            { "passageIds": ["g4-..."], "itemIds": ["g4-...-q1", "..."] }
          ]
        }
      ]
    }
  ],
  "passages": [
    {
      "id": "g4-...",
      "title": "…",
      "kind": "informational",                  // "informational" | "literary"
      "genre": "Science",
      "grade": 4,
      "paragraphs": ["…", "…"]                  // numbered by index+1 in the UI
    }
  ],
  "items": [ /* see per-type fields below */ ]
}
```

**Common item fields:** `id`, `type`, `passageIds` (string[]), `skill` (human-readable tag for the by-skill summary).

**Per-type fields:**
- `multiple_choice`: `stem`, `options:[{id,text}]`, `correct` (option id), `rationale`.
- `multiple_select`: `stem`, `options:[{id,text}]`, `correct` (string[]), `rationale`.
- `two_part_ebsr`: `partA:{stem,options,correct}`, `partB:{stem,options,correct}`, `rationale`.
- `evidence_select`: `stem`, `paragraphScope` (int|null), `correct` (string[] — exact sentence texts), `rationale`.
- `order`: `stem`, `elements:[{id,text}]`, `correctOrder` (string[] of element ids), `rationale`.
- `inline_dropdown`: `stem` (with `{{blankId}}` tokens), `blanks:{blankId:{options:[{id,text}],correct}}`, `rationale`.
- `short_response`: `stem`, `requireCitation` (bool), `rubricMax` (int), `sampleAnswer` (string).
- `prose_response`: `stem`, `taskType` ("narrative"|"research_simulation"|"literary_analysis"), `requireCitation` (bool), `wordCountHint` (int|null), `rubricMax` (int), `rubric` (string[]), `sampleResponse` (string|null).

> `skill` tags are honest, human-readable labels (e.g., "Central idea", "Inference", "Cite the evidence"), **not** official standard codes; do not present them as such.

Render `evidence_select` by splitting the scoped paragraph(s) into sentences and matching the student's clicked sentences against `correct` by trimmed text equality. **Use one shared sentence-splitting utility** for both rendering and scoring so they agree.

The content file is bundled into the image at build (e.g., `/app/content/cmas-content.json`) and **SHOULD** be overridable by mounting a replacement file/volume, so the parent can update content without rebuilding. Serve whatever is present at `GET /api/content`; the client validates it with Zod at load.

---

## 11. Backend API (MUST)

Small JSON API, same origin as the app (no CORS needed). Per-profile data keyed by `profile` ∈ {`olive`, `fox`}.

- `GET /api/health` → `{ "ok": true }` (used by the container healthcheck).
- `GET /api/content` → the parsed `cmas-content.json`.
- `GET /api/profiles` → `[{ "id":"olive","name":"Olive","grade":6,"formId":"g6-form-a" }, { "id":"fox","name":"Fox","grade":4,"formId":"g4-form-a" }]`.
- `GET /api/state/:profile` → the in-progress session state (responses, flags, highlights, notes, eliminated answers) or `null`.
- `PUT /api/state/:profile` → save/replace in-progress state (debounced autosave from the client).
- `DELETE /api/state/:profile` → clear in-progress state (e.g., on submit or retake).
- `GET /api/results/:profile` → array of that child's completed results (most recent first).
- `POST /api/results/:profile` → append a completed result.
- `GET /api/results` → results for **all** profiles, for the parent review view.

Concurrency: each child writes only their own profile, so simple last-write-wins per profile is acceptable. Validate `:profile` against the known set; reject others.

---

## 12. Visual & UX requirements

- Clean, modern, **calm** styling; high readability (legible passage font, generous line height, comfortable measure).
- Functionally TestNav-like (tool toolbar, split passage/item layout, item nav, review screen), but an **original** visual identity — do **not** imitate Pearson branding.
- Respect the selected contrast theme and text size everywhere.
- All interactive elements keyboard-operable with visible focus states.

---

## 13. Accessibility (MUST)

- Full keyboard navigation; logical tab order; ARIA roles/labels on tools, options, nav.
- Color is never the only signal (eliminated answers also show strikethrough; flagged items show an icon).
- Meet WCAG AA contrast in the default theme; text scales without breaking layout.
- **SHOULD:** a read-aloud (Web Speech API) toggle for passages/items to mirror the CMAS text-to-speech accommodation (stretch, §16).

---

## 14. Out of scope / non-goals (MUST NOT build)

- **No router port-forwarding.** The only public path is the outbound-initiated Cloudflare Tunnel (§4); the LAN port `8473` must not be exposed via NAT/PAT.
- No real accounts, passwords, or PII **inside the app** — profile selection (Olive/Fox) is the only in-app "identity." Public-side authentication is enforced at the Cloudflare Access edge (allow-list: `jason.shawn.baker@gmail.com`), not by the app itself.
- No secure-browser lockdown / proctoring / anti-cheat.
- No automated grading of essays or short responses.
- No analytics or data that leave the server.
- No Pearson/TestNav/CMAS branding, logos, or official content.

---

## 15. Project structure (SHOULD)

```
cmas-sim/
  docker-compose.yml
  Dockerfile
  README.md
  package.json                 # may be a workspace root, or separate client/server
  client/                      # Vite React app
    index.html
    src/
      main.tsx
      App.tsx
      content/ schema.ts        # Zod schema + types (validates /api/content)
      api/                      # client calls to /api/* (state, results, content)
      store/
      routes/                   # Home(profile), Settings, FormSelect, Runner, Review, Results, ParentReview
      components/
        passage/ items/ tools/ review/ results/
      lib/                      # sentence-splitter, scoring, formatting
      styles/
  server/                      # Node/TS backend
    src/
      index.ts                  # serves dist/ + /api/*, listens on 0.0.0.0:PORT
      db.ts                     # SQLite (better-sqlite3) at /data/cmas.db
      routes/                   # health, content, profiles, state, results
    content/cmas-content.json   # bundled content (overridable via volume mount)
```

(If a single `package.json` is simpler than a client/server split, that is acceptable as long as the Dockerfile builds the client and the server serves it.)

---

## 16. Stretch goals (MAY)

- PWA / installable client.
- Draggable magnifier in addition to the text-size control.
- Web Speech API read-aloud.
- Progress dashboard with by-skill trends over time per child.
- Print/export a results summary (PDF) for the parent.
- A small content-validation script so the parent can safely add passages by editing JSON.

---

## 17. Definition of Done (acceptance checklist — MUST all pass)

- [ ] `docker compose up -d --build` brings the app up on the server; it is reachable at `http://10.0.0.16:8473` from another device on the LAN, and **not** reachable from outside the home network.
- [ ] Home screen offers **Olive (Grade 6)** and **Fox (Grade 4)**; each loads the correct form.
- [ ] **Two profiles can be used simultaneously** from two devices without their data colliding.
- [ ] All eight item types (§7) render and accept input correctly.
- [ ] All tools 8.1–8.11 work; highlights and notes persist per passage; eliminated answers, flags, and responses persist (server-side) and survive a page reload and a container restart.
- [ ] Passage panel shows numbered paragraphs and supports the highlighter and sentence-level selection for `evidence_select`.
- [ ] Review screen shows answered/unanswered/flagged status and lets the student jump to any item; Submit requires confirmation.
- [ ] Results auto-scores objective items, shows correct answers + rationales, groups by skill, and presents written responses with sample/rubric and a parent-scoring control; a parent view lists results for **both** children.
- [ ] Settings (contrast, text size, line reader, spell-check, timer) apply and persist.
- [ ] Tutorial overlay launches on first run and is relaunchable; nothing reveals answers during an active attempt.
- [ ] Backend persists to the mounted `/data` volume; `GET /api/health` returns ok and powers the healthcheck.
- [ ] No third-party network calls at runtime; non-affiliation footer present; no Pearson/CMAS branding or official content.
- [ ] README documents run/build/deploy, the port, LAN-only exposure (incl. binding to `10.0.0.16` and firewall note), backing up `/data`, and updating content.
- [ ] Repo initialized and pushed to `git@github.com:jsbake2/cmas.git` on `main`, with a correct `.gitignore` (no `node_modules/`, `dist/`, `.env`, or `/data`/SQLite files committed); source, Docker files, and `cmas-content.json` are committed; no secrets in history.

---

## 18. Build / run / deploy

- **Local dev:** `npm install`, run client (`vite`) and server together (a `dev` script **SHOULD** run both; the client proxies `/api` to the server).
- **Container:** `docker compose up -d --build` on `10.0.0.16`. App at `http://10.0.0.16:8473`.
- **Port change:** edit `PORT` and the compose mapping.
- **Backup:** the `/data` volume holds the SQLite store; document how to copy/restore it.
- **Update content:** replace the bundled `cmas-content.json` (or the mounted override) and restart the container.
- Provide a **README.md** covering all of the above and pointing back to §10 for the content schema.

---

## 19. Repository & version control (MUST)

- **Git remote:** `git@github.com:jsbake2/cmas.git` (SSH). Initialize the repository in the project root and push there.
- **Default branch:** `main`. Use clear, incremental commits. Feature branches with PRs are fine but **MAY** be skipped for this personal project; committing to `main` is acceptable.
- **`.gitignore` (MUST be correct):** ignore `node_modules/`, build output (`dist/`, `client/dist/`), `.env*`, logs, OS cruft (`.DS_Store`), and **all runtime data** — the persistence store and any SQLite files (`*.db`, `*.sqlite*`, `/data`). The children's responses and results are local data, **never** committed.
- **Do commit:** all source, `Dockerfile`, `docker-compose.yml`, `README.md`, and `cmas-content.json` (original practice content — safe to version).
- **No secrets in git.** This app requires none; keep it that way (no tokens, no `.env` with secrets committed).
- Document first-time setup in the README, e.g.:
  ```bash
  git init
  git add .
  git commit -m "Initial commit: CMAS practice simulator"
  git branch -M main
  git remote add origin git@github.com:jsbake2/cmas.git
  git push -u origin main
  ```
