import type { SchoolSummary } from "./types";

/** Names people actually say, for tight spots (cards, tape, headlines). */
const SHORT: Record<string, string> = {
  "penn-state": "Penn State",
  rutgers: "Rutgers",
  "georgia-tech": "Georgia Tech",
  umd: "Maryland",
  unc: "UNC Chapel Hill",
  "ohio-state": "Ohio State",
  "notre-dame": "Notre Dame",
  uga: "Georgia",
  "boston-college": "Boston College",
  uconn: "UConn",
  duke: "Duke",
  dartmouth: "Dartmouth",
  "university-of-michigan": "Michigan",
  ucla: "UCLA",
  "university-of-alabama": "Alabama",
  "virginia-tech": "Virginia Tech",
  cornell: "Cornell",
  northwestern: "Northwestern",
};

export function shortName(s: Pick<SchoolSummary, "id" | "name">): string {
  return SHORT[s.id] ?? s.name.replace(/^The /, "").replace(/\s*\(.*\)$/, "");
}

/** Sort key for A to Z: ignores a leading "The". */
export function sortKey(name: string): string {
  return name.replace(/^The\s+/i, "").toLowerCase();
}
