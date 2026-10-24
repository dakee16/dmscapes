import type { CampusPlace, PlaceKind } from "@/lib/hall-finder";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Places for the finder's search: by name, short name, code or alias. An exact code
 * ("WLD", "HUB") comes first, then names that start with the query, then any word match.
 * With `kind` and no query, every place of that kind (the Library / Gym / Dining adds).
 */
export function searchPlaces(places: CampusPlace[], query: string, kind?: PlaceKind): CampusPlace[] {
  const q = norm(query);
  const pool = kind ? places.filter((p) => p.kind === kind) : places;
  if (!q) return kind ? [...pool].sort((a, b) => a.name.localeCompare(b.name)) : [];
  const scored: { p: CampusPlace; score: number }[] = [];
  for (const p of pool) {
    const names = [p.name, p.short, ...p.aliases].map(norm);
    const score = p.codes.some((c) => norm(c) === q)
      ? 0
      : names.some((n) => n === q)
        ? 1
        : names.some((n) => n.startsWith(q))
          ? 2
          : names.some((n) => n.split(" ").some((w) => w.startsWith(q))) || p.codes.some((c) => norm(c).startsWith(q))
            ? 3
            : -1;
    if (score >= 0) scored.push({ p, score });
  }
  return scored.sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name)).map((s) => s.p);
}
