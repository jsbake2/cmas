import type { Item, Unit } from "@/content/schema";

export interface FlatItem {
  itemId: string;
  sectionIdx: number;
}

export function flattenUnit(unit: Unit): FlatItem[] {
  const out: FlatItem[] = [];
  unit.sections.forEach((s, sectionIdx) => {
    for (const id of s.itemIds) out.push({ itemId: id, sectionIdx });
  });
  return out;
}

export type RenderItem = Item;
