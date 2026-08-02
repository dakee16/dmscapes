import rawIndex from "./schools-index.json";
import type { SchoolSummary } from "./types";

export const SCHOOLS = rawIndex as SchoolSummary[];

export function getSchool(id: string): SchoolSummary | undefined {
  return SCHOOLS.find((s) => s.id === id);
}

/** Case-insensitive substring match on name/city/state for the autocomplete. */
export function searchSchools(query: string): SchoolSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return SCHOOLS;
  return SCHOOLS.filter((s) =>
    [s.name, s.city ?? "", s.state ?? ""].some((f) => f.toLowerCase().includes(q))
  );
}

/** "15 × 12 ft" (rounded to sensible precision) or null when unpublished. */
export function formatDims(lengthFt: number | null, widthFt: number | null): string | null {
  if (!lengthFt || !widthFt) return null;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `${fmt(lengthFt)} × ${fmt(widthFt)} ft`;
}

/** Room types present in a school's data (for the SEO college pages). */
export function roomTypesOf(school: SchoolSummary): string[] {
  const types = new Set<string>();
  for (const d of school.dorms) for (const r of d.rooms) types.add(r.type);
  return [...types];
}
