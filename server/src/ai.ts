/**
 * Quick-and-dirty AI feedback on written responses via a local Ollama
 * server (default qwen2.5:14b). Strictly a parent-and-kid preview; never
 * a substitute for the parent's rubric scoring.
 *
 * Env:
 *   OLLAMA_URL    base URL of the Ollama server (default http://ollama:11434)
 *   OLLAMA_MODEL  model tag (default qwen2.5:14b)
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:14b";

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
    "",
    "Return the JSON object now.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analyzeWriting(
  input: AnalyzeInput,
): Promise<WritingAnalysis> {
  const body = {
    model: OLLAMA_MODEL,
    stream: false,
    format: "json",
    options: {
      temperature: 0.2,
      num_predict: 700,
    },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(input) },
    ],
  };

  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    throw new Error(`Ollama returned ${r.status}: ${await r.text()}`);
  }
  const payload = (await r.json()) as { message?: { content?: string } };
  const content = payload.message?.content;
  if (!content) throw new Error("Ollama returned no content");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`Ollama returned non-JSON content: ${content.slice(0, 200)}`);
  }
  return normalize(parsed);
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
    enabled: !!process.env.OLLAMA_URL || true,
    url: OLLAMA_URL,
    model: OLLAMA_MODEL,
  };
}
