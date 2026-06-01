export const PROFILES = [
  { id: "olive", name: "Olive", grade: 6, formId: "g6-form-a" },
  { id: "fox", name: "Fox", grade: 4, formId: "g4-form-a" },
] as const;

export const PROFILE_IDS = new Set(PROFILES.map((p) => p.id));

export function isProfileId(s: string): s is (typeof PROFILES)[number]["id"] {
  return PROFILE_IDS.has(s as (typeof PROFILES)[number]["id"]);
}
