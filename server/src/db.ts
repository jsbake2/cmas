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
  insertResult: db.prepare<[string, string, number, string]>(
    `INSERT INTO results(id, profile, submitted_at, json) VALUES(?, ?, ?, ?)`,
  ),
  updateResult: db.prepare<[string, string, string]>(
    `UPDATE results SET json = ? WHERE profile = ? AND id = ?`,
  ),
};
