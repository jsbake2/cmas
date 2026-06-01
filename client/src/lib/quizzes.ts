import type { Content, Form, Passage } from "@/content/schema";

export interface Quiz {
  /** 1-based ordinal within the form (the "Quiz N" the kid sees). */
  quizN: number;
  /** Stable string id used in URLs and as the upsert key. */
  quizId: string;
  unitId: string;
  unitTitle: string;
  sectionIdx: number;
  /** First (typically only) passage of the section. */
  passage: Passage;
  itemIds: string[];
}

/** Enumerate quizzes in display order for the given form. */
export function enumerateQuizzes(
  form: Form,
  passagesById: Map<string, Passage>,
): Quiz[] {
  const out: Quiz[] = [];
  let n = 0;
  for (const unit of form.units) {
    unit.sections.forEach((s, sectionIdx) => {
      n += 1;
      const passage = passagesById.get(s.passageIds[0]);
      if (!passage) return;
      out.push({
        quizN: n,
        quizId: String(n),
        unitId: unit.id,
        unitTitle: unit.title,
        sectionIdx,
        passage,
        itemIds: s.itemIds,
      });
    });
  }
  return out;
}

export function findQuiz(
  content: Content,
  formId: string,
  passagesById: Map<string, Passage>,
  quizId: string,
): Quiz | undefined {
  const form = content.forms.find((f) => f.id === formId);
  if (!form) return undefined;
  const list = enumerateQuizzes(form, passagesById);
  return list.find((q) => q.quizId === quizId);
}
