import express, { type Request, type Response } from "express";
import { resolve, dirname } from "node:path";
import { existsSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, stmts } from "./db.js";
import { getContent, getContentPath } from "./content.js";
import { PROFILES, isProfileId } from "./profiles.js";
import { aiInfo, analyzeWriting, type WritingAnalysis } from "./ai.js";
import { rateLimit, singleFlight } from "./ratelimit.js";
import {
  computeProgress,
  bumpStreak,
  type ProgressSummary,
  type StoredResult,
} from "./progress.js";

const PORT = Number(process.env.PORT ?? 8473);
const HOST = process.env.HOST ?? "0.0.0.0";

const __dirname = dirname(fileURLToPath(import.meta.url));
function pickClientDist(): string {
  if (process.env.CLIENT_DIST) return process.env.CLIENT_DIST;
  // module is at <repo>/server/dist/index.js → repo client dist is ../../client/dist
  const candidates = [
    resolve(__dirname, "..", "..", "client", "dist"),
    resolve(process.cwd(), "client", "dist"),
    resolve(process.cwd(), "..", "client", "dist"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}
const CLIENT_DIST = pickClientDist();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.disable("x-powered-by");

// --- API ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/content", (_req, res) => {
  try {
    res.json(getContent());
  } catch (e) {
    console.error("[content] failed to read", getContentPath(), e);
    res.status(500).json({ error: "Content file not available" });
  }
});

app.get("/api/profiles", (_req, res) => {
  res.json(PROFILES);
});

function requireProfile(req: Request, res: Response): string | null {
  const p = String(req.params.profile);
  if (!isProfileId(p)) {
    res.status(404).json({ error: "Unknown profile" });
    return null;
  }
  return p;
}

type ProfileId = (typeof PROFILES)[number]["id"];

function formIdFor(p: ProfileId): string {
  return PROFILES.find((x) => x.id === p)!.formId;
}

function totalQuizzesFor(formId: string): number {
  const content = getContent() as {
    forms: Array<{ id: string; units: Array<{ sections: unknown[] }> }>;
  };
  const form = content.forms.find((f) => f.id === formId);
  if (!form) return 0;
  return form.units.reduce((n, u) => n + u.sections.length, 0);
}

function resultsFor(p: ProfileId): StoredResult[] {
  const rows = stmts.getResultsByProfile.all(p) as { json: string }[];
  const out: StoredResult[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.json) as StoredResult);
    } catch {
      /* skip corrupt row */
    }
  }
  return out;
}

function priorProgress(p: ProfileId): {
  streakCount: number;
  lastActiveDate: string | null;
  badges: string[];
} {
  const row = stmts.getProgress.get(p) as { json: string } | undefined;
  if (!row) return { streakCount: 0, lastActiveDate: null, badges: [] };
  try {
    const j = JSON.parse(row.json) as ProgressSummary;
    return {
      streakCount: j.streakCount ?? 0,
      lastActiveDate: j.lastActiveDate ?? null,
      badges: j.badges ?? [],
    };
  } catch {
    return { streakCount: 0, lastActiveDate: null, badges: [] };
  }
}

/**
 * Recompute the gamification summary from stored results + content and
 * persist it. `advanceStreak` is true only on a real completion event
 * (a result POST) so re-fetches and resets don't inflate the streak.
 */
function recomputeProgress(p: ProfileId, advanceStreak: boolean): ProgressSummary {
  const prior = priorProgress(p);
  const streak = advanceStreak
    ? bumpStreak(prior)
    : { streakCount: prior.streakCount, lastActiveDate: prior.lastActiveDate };
  const content = getContent() as Parameters<typeof computeProgress>[0]["content"];
  const summary = computeProgress({
    results: resultsFor(p),
    content,
    totalQuizzes: totalQuizzesFor(formIdFor(p)),
    streakCount: streak.streakCount,
    lastActiveDate: streak.lastActiveDate,
    priorBadges: prior.badges,
  });
  stmts.putProgress.run(p, JSON.stringify(summary), Date.now());
  return summary;
}

app.get("/api/state/:profile", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  const row = stmts.getState.get(p) as { json: string } | undefined;
  if (!row) return res.json(null);
  try {
    res.json(JSON.parse(row.json));
  } catch {
    res.json(null);
  }
});

app.put("/api/state/:profile", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Body required" });
  }
  // Reject obvious cross-profile writes
  const incomingProfile = (req.body as { profile?: string }).profile;
  if (incomingProfile && incomingProfile !== p) {
    return res
      .status(400)
      .json({ error: "Profile in body does not match URL" });
  }
  const json = JSON.stringify(req.body);
  stmts.putState.run(p, json, Date.now());
  res.json({ ok: true });
});

app.delete("/api/state/:profile", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  stmts.deleteState.run(p);
  res.json({ ok: true });
});

app.get("/api/results/:profile", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  const rows = stmts.getResultsByProfile.all(p) as { json: string }[];
  const out = rows.map((r) => {
    try {
      return JSON.parse(r.json);
    } catch {
      return null;
    }
  }).filter(Boolean);
  res.json(out);
});

app.post("/api/results/:profile", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Body required" });
  }
  const body = req.body as {
    profile?: string;
    quizId?: string;
    unitId?: string;
    submittedAt?: number;
    parentScores?: Record<string, number>;
  };
  if (body.profile && body.profile !== p) {
    return res
      .status(400)
      .json({ error: "Profile in body does not match URL" });
  }
  const quizId = body.quizId ?? body.unitId;
  if (!quizId) {
    return res.status(400).json({ error: "quizId required" });
  }

  // If a result for this (profile, quiz) already exists, preserve its id and
  // any parent scores already entered so a re-submit doesn't wipe them.
  const existing = stmts.getResultByQuiz.get(p, quizId) as
    | { id: string; json: string }
    | undefined;
  const id = existing?.id ?? randomUUID();
  let priorParent: Record<string, number> | undefined;
  if (existing) {
    try {
      priorParent = (JSON.parse(existing.json) as { parentScores?: Record<string, number> })
        .parentScores;
    } catch {
      priorParent = undefined;
    }
  }
  const submittedAt = Number(body.submittedAt) || Date.now();
  const stored = {
    ...body,
    id,
    profile: p,
    quizId,
    submittedAt,
    parentScores: { ...(priorParent ?? {}), ...(body.parentScores ?? {}) },
  };
  stmts.upsertResult.run(id, p, quizId, submittedAt, JSON.stringify(stored));
  // A submit is a completion event: recompute progress and advance the streak.
  const progress = recomputeProgress(p as ProfileId, true);
  res.status(existing ? 200 : 201).json({ ...stored, progress });
});

app.get("/api/progress/:profile", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  res.json(recomputeProgress(p as ProfileId, false));
});

/**
 * Quick AI preview of a written response. Calls the Claude API and stores the
 * result on the saved result row so subsequent page loads don't re-call it.
 *
 * Guarded against a spammed button: a per-profile sliding-window rate limit
 * (each Claude call costs money) plus a single-flight lock so the same item
 * can't be analyzed twice concurrently. Both return 429.
 */
app.post(
  "/api/results/:profile/:resultId/ai-analyze/:itemId",
  rateLimit({
    windowMs: 60_000,
    max: 40, // comfortably covers an "Analyze all" pass; blocks real spam
    keyOf: (req) => `ai:${req.params.profile}`,
    message:
      "Too many AI feedback requests in a short time — please wait a bit and try again.",
  }),
  singleFlight({
    keyOf: (req) =>
      `ai:${req.params.profile}:${req.params.resultId}:${req.params.itemId}`,
    message: "This response is already being analyzed — hold on a moment.",
  }),
  async (req, res) => {
    const p = requireProfile(req, res);
    if (!p) return;
    const { resultId, itemId } = req.params;

    const row = stmts.getResult.get(p, String(resultId)) as
      | { json: string }
      | undefined;
    if (!row) return res.status(404).json({ error: "Result not found" });
    let result: {
      formId?: string;
      responses?: Record<string, unknown>;
      aiAnalyses?: Record<string, WritingAnalysis>;
    };
    try {
      result = JSON.parse(row.json);
    } catch {
      return res.status(500).json({ error: "Stored result is corrupted" });
    }
    const responseText = result.responses?.[itemId];
    if (typeof responseText !== "string" || !responseText.trim()) {
      return res
        .status(400)
        .json({ error: "Item has no written response to analyze" });
    }

    // Look up the item and passage from the content file.
    const content = getContent() as {
      items: Array<Record<string, unknown>>;
      passages: Array<{ id: string; title: string; paragraphs: string[] }>;
    };
    const item = content.items.find((i) => i.id === itemId) as
      | (Record<string, unknown> & {
          type: string;
          stem?: string;
          passageIds?: string[];
          requireCitation?: boolean;
          rubric?: string[];
          taskType?: string;
        })
      | undefined;
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.type !== "short_response" && item.type !== "prose_response") {
      return res
        .status(400)
        .json({ error: "AI analysis only applies to written responses" });
    }
    const passage = content.passages.find(
      (pp) => pp.id === (item.passageIds ?? [])[0],
    );

    const grade = p === "olive" ? 6 : 4;
    const studentName = p === "olive" ? "Olive" : "Fox";

    let analysis: WritingAnalysis;
    try {
      analysis = await analyzeWriting({
        studentName,
        grade,
        passageTitle: passage?.title ?? "",
        passageText: passage?.paragraphs.join("\n\n") ?? "",
        prompt: String(item.stem ?? ""),
        studentResponse: responseText,
        rubric: Array.isArray(item.rubric) ? (item.rubric as string[]) : undefined,
        requireCitation: !!item.requireCitation,
        taskType:
          item.type === "short_response"
            ? "short"
            : (item.taskType as
                | "narrative"
                | "research_simulation"
                | "literary_analysis"
                | undefined),
      });
    } catch (e) {
      console.error("[ai] analyze failed", e);
      return res.status(502).json({
        error: "AI analyzer is unavailable right now",
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    result.aiAnalyses = { ...(result.aiAnalyses ?? {}), [itemId]: analysis };
    stmts.updateResult.run(JSON.stringify(result), p, String(resultId));
    res.json({ ok: true, analysis });
  },
);

app.get("/api/ai/info", (_req, res) => {
  res.json(aiInfo());
});

/**
 * Reset a single quiz: delete its completed result and, if the in-progress
 * session is for that same quiz, drop the session too. The student can then
 * take that quiz again from scratch without affecting their other progress.
 */
app.delete("/api/results/:profile/:resultId", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  const { resultId } = req.params;
  const row = stmts.getResult.get(p, String(resultId)) as
    | { json: string }
    | undefined;
  if (!row) return res.status(404).json({ error: "Result not found" });
  let quizId: string | undefined;
  try {
    quizId = (JSON.parse(row.json) as { quizId?: string }).quizId;
  } catch {
    quizId = undefined;
  }
  stmts.deleteResultById.run(p, String(resultId));

  // If the in-progress session is for this same quiz, clear it too —
  // otherwise leave it alone (the student may be mid-attempt on a different
  // quiz).
  if (quizId) {
    const stRow = stmts.getState.get(p) as { json: string } | undefined;
    if (stRow) {
      try {
        const st = JSON.parse(stRow.json) as { quizId?: string };
        if (st.quizId === quizId) stmts.deleteState.run(p);
      } catch {}
    }
  }
  // XP for the removed quiz drops out; badges + streak stay sticky.
  recomputeProgress(p as ProfileId, false);
  res.json({ ok: true });
});

/**
 * Wipe everything for a profile: in-progress session + all completed results.
 * The "reset progress" button in the UI calls this.
 */
app.delete("/api/profile/:profile/all-data", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  stmts.deleteState.run(p);
  const r = stmts.deleteResultsForProfile.run(p);
  // Full reset = clean slate, including XP, badges, and streak.
  stmts.deleteProgress.run(p);
  res.json({ ok: true, removedResults: r.changes });
});

app.get("/api/results", (_req, res) => {
  const rows = stmts.getAllResults.all() as { json: string }[];
  const out = rows
    .map((r) => {
      try {
        return JSON.parse(r.json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  res.json(out);
});

app.patch("/api/results/:profile/:id/parent-score", (req, res) => {
  const p = requireProfile(req, res);
  if (!p) return;
  const { id } = req.params;
  const body = req.body as { itemId?: string; score?: number };
  if (
    !body ||
    typeof body.itemId !== "string" ||
    typeof body.score !== "number"
  ) {
    return res.status(400).json({ error: "itemId and score required" });
  }
  const row = stmts.getResult.get(p, String(id)) as
    | { json: string }
    | undefined;
  if (!row) return res.status(404).json({ error: "Result not found" });
  let result: { parentScores?: Record<string, number> };
  try {
    result = JSON.parse(row.json);
  } catch {
    return res.status(500).json({ error: "Stored result is corrupted" });
  }
  result.parentScores = { ...(result.parentScores ?? {}), [body.itemId]: body.score };
  stmts.updateResult.run(JSON.stringify(result), p, String(id));
  res.json({ ok: true });
});

// --- Static client ---
if (existsSync(CLIENT_DIST) && statSync(CLIENT_DIST).isDirectory()) {
  console.log(`[server] serving client from ${CLIENT_DIST}`);
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(resolve(CLIENT_DIST, "index.html"));
  });
} else {
  console.log(
    `[server] CLIENT_DIST not found at ${CLIENT_DIST}; serving API only (dev mode uses Vite for the UI)`,
  );
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] content path: ${getContentPath()}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
function shutdown() {
  console.log("[server] shutting down");
  server.close(() => {
    try {
      db.close();
    } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
