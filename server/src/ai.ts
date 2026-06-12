/**
 * Quick AI feedback on written responses via the Claude API (Anthropic).
 * Strictly a parent-and-kid preview; never a substitute for the parent's
 * rubric scoring.
 *
 * Env:
 *   ANTHROPIC_API_KEY  Anthropic API key (required). Read automatically by
 *                      the SDK; never logged or echoed.
 *   CLAUDE_MODEL       model id (default claude-haiku-4-5 — cheapest, and
 *                      already far stronger than the old local qwen2.5:14b).
 *                      Set claude-sonnet-4-6 or claude-opus-4-8 for more
 *                      quality at higher cost.
 */

import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — the AI feedback service is unconfigured",
    );
  }
  // The SDK reads ANTHROPIC_API_KEY from the environment on construction.
  _client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });
  return _client;
}

export interface SpellingIssue {
  misspelled: string;
  suggestion: string;
}
export interface GrammarIssue {
  issue: string;
  where: string;
}
export interface WritingAnalysis {
  overall: string;
  spelling: SpellingIssue[];
  grammar: GrammarIssue[];
  addresses_prompt: "yes" | "partial" | "no";
  next_step: string;
}

export interface AnalyzeInput {
  studentName: string;
  grade: number;
  passageTitle: string;
  passageText: string;
  prompt: string;
  studentResponse: string;
  rubric?: string[];
  requireCitation?: boolean;
  taskType?: "short" | "narrative" | "research_simulation" | "literary_analysis";
}

const SYSTEM = `You are a helpful, encouraging tutor giving a QUICK, KID-FRIENDLY preview of a student's written response on a state ELA practice test. You are NOT the official grader — a parent will read the response in detail afterward. Keep feedback short, specific, and aimed at the student's grade level.

Output ONLY a JSON object matching this schema:
{
  "overall": "<one sentence, encouraging but honest, plain language>",
  "spelling": [{"misspelled": "<word as the student wrote it>", "suggestion": "<correct spelling>"}],
  "grammar": [{"issue": "<short description, kid-friendly>", "where": "<a few words from the response showing where>"}],
  "addresses_prompt": "yes" | "partial" | "no",
  "next_step": "<one sentence: the single most useful concrete thing to fix or add next time>"
}

Rules:
- Only flag spelling/grammar issues that are real. If the response is clean, return empty arrays.
- Do NOT rewrite the response. Do NOT score it numerically.
- "addresses_prompt" is "yes" only if the response answers what was asked using the passage.
- For grade 4, use very simple words. For grade 6, you can use somewhat more advanced words but still kid-friendly.
- Never include any text outside the JSON object.`;

function userPrompt(i: AnalyzeInput): string {
  return [
    `Student: ${i.studentName} (Grade ${i.grade})`,
    `Passage: ${i.passageTitle}`,
    "",
    "PASSAGE:",
    i.passageText,
    "",
    "PROMPT:",
    i.prompt,
    i.requireCitation
      ? "(The prompt asks the student to cite the passage.)"
      : "",
    i.rubric && i.rubric.length
      ? `RUBRIC POINTS:\n- ${i.rubric.join("\n- ")}`
      : "",
    "",
    "STUDENT RESPONSE:",
    i.studentResponse,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analyzeWriting(
  input: AnalyzeInput,
): Promise<WritingAnalysis> {
  const response = await client().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("Claude returned no content");

  return normalize(parseJson(text));
}

/** Parse the model's reply as JSON, tolerating any stray prose around it. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error(`Claude returned non-JSON content: ${text.slice(0, 200)}`);
  }
}

function normalize(raw: unknown): WritingAnalysis {
  const r = (raw ?? {}) as Partial<WritingAnalysis> & Record<string, unknown>;
  const addr = (r as { addresses_prompt?: string }).addresses_prompt;
  return {
    overall: String(r.overall ?? "").slice(0, 400),
    spelling: Array.isArray(r.spelling)
      ? r.spelling
          .filter(
            (x): x is SpellingIssue =>
              typeof x === "object" &&
              x !== null &&
              typeof (x as SpellingIssue).misspelled === "string" &&
              typeof (x as SpellingIssue).suggestion === "string",
          )
          .slice(0, 20)
      : [],
    grammar: Array.isArray(r.grammar)
      ? r.grammar
          .filter(
            (x): x is GrammarIssue =>
              typeof x === "object" &&
              x !== null &&
              typeof (x as GrammarIssue).issue === "string" &&
              typeof (x as GrammarIssue).where === "string",
          )
          .slice(0, 20)
      : [],
    addresses_prompt:
      addr === "yes" || addr === "partial" || addr === "no" ? addr : "partial",
    next_step: String(r.next_step ?? "").slice(0, 400),
  };
}

export function aiInfo() {
  return {
    enabled: !!process.env.ANTHROPIC_API_KEY,
    provider: "anthropic",
    model: CLAUDE_MODEL,
  };
}
