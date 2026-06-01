import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "/data/cmas.db";

mkdirSync(dirname(DB_PATH), { recursive: true });
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    profile TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    profile TEXT NOT NULL,
    submitted_at INTEGER NOT NULL,
    json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_results_profile
    ON results(profile, submitted_at DESC);
`);

// Migrate: add quiz_id column + UNIQUE(profile, quiz_id) so re-submits upsert.
const cols = db.prepare("PRAGMA table_info('results')").all() as Array<{
  name: string;
}>;
if (!cols.some((c) => c.name === "quiz_id")) {
  db.exec("ALTER TABLE results ADD COLUMN quiz_id TEXT");
  // Populate from JSON where possible so the UNIQUE index can land.
  const rows = db
    .prepare("SELECT id, json FROM results WHERE quiz_id IS NULL")
    .all() as Array<{ id: string; json: string }>;
  const upd = db.prepare("UPDATE results SET quiz_id = ? WHERE id = ?");
  for (const r of rows) {
    try {
      const j = JSON.parse(r.json) as {
        quizId?: string;
        unitId?: string;
      };
      upd.run(j.quizId ?? j.unitId ?? r.id, r.id);
    } catch {
      upd.run(r.id, r.id);
    }
  }
}
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_results_profile_quiz ON results(profile, quiz_id)",
);

export const stmts = {
  getState: db.prepare<[string]>(`SELECT json FROM state WHERE profile = ?`),
  putState: db.prepare<[string, string, number]>(
    `INSERT INTO state(profile, json, updated_at)
       VALUES(?, ?, ?)
       ON CONFLICT(profile) DO UPDATE SET
         json = excluded.json,
         updated_at = excluded.updated_at`,
  ),
  deleteState: db.prepare<[string]>(`DELETE FROM state WHERE profile = ?`),

  getResultsByProfile: db.prepare<[string]>(
    `SELECT json FROM results WHERE profile = ? ORDER BY submitted_at DESC`,
  ),
  getAllResults: db.prepare(
    `SELECT json FROM results ORDER BY submitted_at DESC`,
  ),
  getResult: db.prepare<[string, string]>(
    `SELECT json FROM results WHERE profile = ? AND id = ?`,
  ),
  getResultByQuiz: db.prepare<[string, string]>(
    `SELECT id, json FROM results WHERE profile = ? AND quiz_id = ?`,
  ),
  /** Upsert by (profile, quiz_id): re-submitting a quiz replaces the row. */
  upsertResult: db.prepare<[string, string, string, number, string]>(
    `INSERT INTO results(id, profile, quiz_id, submitted_at, json)
       VALUES(?, ?, ?, ?, ?)
       ON CONFLICT(profile, quiz_id) DO UPDATE SET
         submitted_at = excluded.submitted_at,
         json = excluded.json`,
  ),
  updateResult: db.prepare<[string, string, string]>(
    `UPDATE results SET json = ? WHERE profile = ? AND id = ?`,
  ),
  deleteResultsForProfile: db.prepare<[string]>(
    `DELETE FROM results WHERE profile = ?`,
  ),
};
