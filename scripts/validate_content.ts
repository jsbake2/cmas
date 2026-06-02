import { readFileSync } from "node:fs";
import { Content } from "../client/src/content/schema";
import { splitSentences, normalizeSentence } from "../client/src/lib/sentence";

const raw = JSON.parse(readFileSync("cmas-content.json", "utf8"));
const parsed = Content.safeParse(raw);
if (!parsed.success) {
  console.error("SCHEMA FAILED:");
  console.error(JSON.stringify(parsed.error.issues, null, 2));
  process.exit(1);
}
const c = parsed.data;
console.log("Schema OK.");

const passagesById = new Map(c.passages.map((p) => [p.id, p]));

let problems = 0;
for (const it of c.items) {
  if (it.type !== "evidence_select") continue;
  const pid = it.passageIds[0];
  const passage = passagesById.get(pid);
  if (!passage) {
    console.error(`evidence_select ${it.id}: passage ${pid} missing`);
    problems++;
    continue;
  }
  // Replicate how the UI builds selectable sentences: split each paragraph,
  // honoring paragraphScope (1-based) if set.
  const paras = it.paragraphScope
    ? [passage.paragraphs[it.paragraphScope - 1]]
    : passage.paragraphs;
  const available = new Set<string>();
  for (const para of paras) {
    if (!para) continue;
    for (const span of splitSentences(para)) {
      available.add(normalizeSentence(span.text));
    }
  }
  for (const want of it.correct) {
    if (!available.has(normalizeSentence(want))) {
      console.error(`evidence_select ${it.id}: correct sentence not found in scope:`);
      console.error(`   wanted: ${JSON.stringify(want)}`);
      console.error(`   had:    ${JSON.stringify([...available])}`);
      problems++;
    }
  }
}

if (problems) {
  console.error(`\n${problems} evidence_select problem(s).`);
  process.exit(1);
}
console.log("All evidence_select sentences match the splitter.");
