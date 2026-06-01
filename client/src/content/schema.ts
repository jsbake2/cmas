import { z } from "zod";

const Option = z.object({
  id: z.string(),
  text: z.string(),
});

const Passage = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["informational", "literary"]),
  genre: z.string(),
  grade: z.number().int(),
  paragraphs: z.array(z.string()).min(1),
});

const ItemBase = z.object({
  id: z.string(),
  passageIds: z.array(z.string()).min(1),
  skill: z.string(),
});

const MultipleChoice = ItemBase.extend({
  type: z.literal("multiple_choice"),
  stem: z.string(),
  options: z.array(Option).min(2),
  correct: z.string(),
  rationale: z.string().optional().default(""),
});

const MultipleSelect = ItemBase.extend({
  type: z.literal("multiple_select"),
  stem: z.string(),
  options: z.array(Option).min(2),
  correct: z.array(z.string()).min(1),
  rationale: z.string().optional().default(""),
});

const TwoPartEBSR = ItemBase.extend({
  type: z.literal("two_part_ebsr"),
  partA: z.object({
    stem: z.string(),
    options: z.array(Option).min(2),
    correct: z.string(),
  }),
  partB: z.object({
    stem: z.string(),
    options: z.array(Option).min(2),
    correct: z.string(),
  }),
  rationale: z.string().optional().default(""),
});

const EvidenceSelect = ItemBase.extend({
  type: z.literal("evidence_select"),
  stem: z.string(),
  paragraphScope: z.number().int().nullable(),
  correct: z.array(z.string()).min(1),
  rationale: z.string().optional().default(""),
});

const OrderItem = ItemBase.extend({
  type: z.literal("order"),
  stem: z.string(),
  elements: z.array(Option).min(2),
  correctOrder: z.array(z.string()).min(2),
  rationale: z.string().optional().default(""),
});

const InlineDropdown = ItemBase.extend({
  type: z.literal("inline_dropdown"),
  stem: z.string(),
  blanks: z.record(
    z.string(),
    z.object({
      options: z.array(Option).min(2),
      correct: z.string(),
    }),
  ),
  rationale: z.string().optional().default(""),
});

const ShortResponse = ItemBase.extend({
  type: z.literal("short_response"),
  stem: z.string(),
  requireCitation: z.boolean().default(false),
  rubricMax: z.number().int().positive(),
  sampleAnswer: z.string(),
});

const ProseResponse = ItemBase.extend({
  type: z.literal("prose_response"),
  stem: z.string(),
  taskType: z.enum(["narrative", "research_simulation", "literary_analysis"]),
  requireCitation: z.boolean().default(false),
  wordCountHint: z.number().int().nullable(),
  rubricMax: z.number().int().positive(),
  rubric: z.array(z.string()).default([]),
  sampleResponse: z.string().nullable(),
});

export const Item = z.discriminatedUnion("type", [
  MultipleChoice,
  MultipleSelect,
  TwoPartEBSR,
  EvidenceSelect,
  OrderItem,
  InlineDropdown,
  ShortResponse,
  ProseResponse,
]);

const Section = z.object({
  passageIds: z.array(z.string()).min(1),
  itemIds: z.array(z.string()).min(1),
});

const Unit = z.object({
  id: z.string(),
  title: z.string(),
  timeLimitMinutes: z.number().int().nullable(),
  sections: z.array(Section).min(1),
});

const Form = z.object({
  id: z.string(),
  grade: z.number().int(),
  title: z.string(),
  units: z.array(Unit).min(1),
});

export const Content = z.object({
  version: z.string(),
  forms: z.array(Form).min(1),
  passages: z.array(Passage).min(1),
  items: z.array(Item).min(1),
});

export type Item = z.infer<typeof Item>;
export type Passage = z.infer<typeof Passage>;
export type Unit = z.infer<typeof Unit>;
export type Form = z.infer<typeof Form>;
export type Content = z.infer<typeof Content>;
export type Section = z.infer<typeof Section>;
export type Option = z.infer<typeof Option>;

export type ItemType = Item["type"];

export function indexContent(c: Content) {
  const passagesById = new Map(c.passages.map((p) => [p.id, p]));
  const itemsById = new Map(c.items.map((i) => [i.id, i]));
  const formsById = new Map(c.forms.map((f) => [f.id, f]));
  return { passagesById, itemsById, formsById };
}
