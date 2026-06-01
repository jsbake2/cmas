import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function pickContentPath(): string {
  if (process.env.CONTENT_PATH) return process.env.CONTENT_PATH;
  const candidates = [
    resolve(__dirname, "..", "..", "cmas-content.json"),
    resolve(process.cwd(), "cmas-content.json"),
    resolve(process.cwd(), "..", "cmas-content.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}
const CONTENT_PATH = pickContentPath();

let cached: unknown | null = null;

export function getContent(): unknown {
  if (cached) return cached;
  const text = readFileSync(CONTENT_PATH, "utf8");
  cached = JSON.parse(text);
  return cached;
}

export function getContentPath(): string {
  return CONTENT_PATH;
}
