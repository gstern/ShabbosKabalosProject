export const CATEGORIES = ["man", "woman", "boy", "girl"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  man: "Man",
  woman: "Woman",
  boy: "Boy",
  girl: "Girl",
};

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export function isChildCategory(c: Category): boolean {
  return c === "boy" || c === "girl";
}

/** Suggestion audiences (per the Rav: just adult / child / both). */
export type Audience = "adult" | "child" | "both";

/**
 * Parse a Suggestion.categories value into an audience.
 * Backward-compatible with older values ("man,woman", "boy,girl", 4-way CSVs).
 */
export function parseAudience(csv: string): Audience {
  const parts = new Set(
    csv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  if (parts.has("both") || parts.has("all")) return "both";
  const adult = parts.has("adult") || parts.has("man") || parts.has("woman");
  const child = parts.has("child") || parts.has("kid") || parts.has("boy") || parts.has("girl");
  if (adult && child) return "both";
  if (child) return "child";
  return "adult";
}

/** Does a suggestion apply to a member of this category? */
export function audienceMatches(csv: string, memberCategory: Category | boolean): boolean {
  const audience = parseAudience(csv);
  if (audience === "both") return true;
  const isChild =
    typeof memberCategory === "boolean"
      ? memberCategory
      : isChildCategory(memberCategory);
  return audience === (isChild ? "child" : "adult");
}

/**
 * A member's category. New signups store it in Member.gender directly;
 * legacy rows (isChild + boy/girl or null) are mapped on read.
 */
export function memberCategory(m: { gender: string | null; isChild: boolean }): Category {
  if (isCategory(m.gender)) return m.gender;
  if (m.isChild) return m.gender === "girl" ? "girl" : "boy";
  return "man"; // legacy adults without a category — admin can correct
}
