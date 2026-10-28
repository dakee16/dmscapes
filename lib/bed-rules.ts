import RULES from "@/lib/bed-rules.json";

/**
 * Lofting and bunking rules by school, as each housing office publishes them.
 * Every stated rule has an official source (lib/bed-rules.json) and the exact
 * quote behind it (data/bed-rules-quotes.json, checked by
 * scripts/check-bed-rules.mjs). Anything a school doesn't publish is "unknown"
 * and is shown as "not published", never guessed.
 */
export type Allowed = "yes" | "no" | "some" | "unknown";
export type YesNo = "yes" | "no" | "unknown";

export interface BedRule {
  loft: Allowed;
  bunk: Allowed;
  how: string | null;
  own_loft_kits: YesNo;
  risers: YesNo;
  riser_max_in: number | null;
  bed_height_in: { min: number; max: number } | null;
  deadline: string | null;
  notes: string | null;
  sources: { url: string; title: string }[];
}

const DATA = RULES as { checked: string; schools: Record<string, BedRule> };

/** The date the rules were last checked against the schools' pages (YYYY-MM-DD). */
export const BED_RULES_CHECKED = DATA.checked;

/** A school's rules, or null when it publishes nothing we could find. */
export function bedRuleFor(schoolId: string): BedRule | null {
  const r = DATA.schools[schoolId];
  if (!r || !r.sources.length) return null;
  return r;
}

export const ALLOWED_LABEL: Record<Allowed, string> = {
  yes: "Allowed",
  no: "Not allowed",
  some: "In some halls",
  unknown: "Not published",
};
export const YES_NO_LABEL: Record<YesNo, string> = { yes: "Allowed", no: "Not allowed", unknown: "Not published" };

/** How many schools publish a rule, and how many allow lofting and bunking. */
export function bedRuleSummary() {
  const rules = Object.values(DATA.schools).filter((r) => r.sources.length);
  const count = (key: "loft" | "bunk", v: Allowed) => rules.filter((r) => r[key] === v).length;
  return {
    schools: rules.length,
    loft: { yes: count("loft", "yes"), some: count("loft", "some"), no: count("loft", "no") },
    bunk: { yes: count("bunk", "yes"), some: count("bunk", "some"), no: count("bunk", "no") },
  };
}

/** Every school with a published rule, by id. */
export function allBedRules(): [string, BedRule][] {
  return Object.entries(DATA.schools).filter(([, r]) => r.sources.length);
}

/** "Oct 28, 2026" from the YYYY-MM-DD check date. */
export function checkedLabel(date = BED_RULES_CHECKED): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
