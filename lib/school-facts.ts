import SOURCES from "./school-sources.json";
import SCHOOL_DATES from "./school-dates.json";
import type { DormSummary, RoomSummary, SchoolSummary } from "./types";
import { bedName, ft, hasDims, isPublished, roomFamily, roomName, sqFtOf } from "./room-preview";
import { formatRoomType } from "./format";
import { isDormRoom } from "./dorm-sizes";

/**
 * Facts about a school's room data that the school and hall pages state up top
 * and the Markdown views repeat: where the sizes came from, when, and the short
 * answer a reader (or an answer engine) is looking for. Server-only: the source
 * map is ~100 KB and stays out of client bundles.
 */

export type Source = { url: string; host: string; collected: string | null };

const SOURCE_MAP = SOURCES as Record<string, { housing: string; halls: Record<string, string> }>;
const DATES = SCHOOL_DATES as Record<string, string>;

const source = (url: string, schoolId: string): Source => ({
  url,
  host: new URL(url).hostname.replace(/^www\./, ""),
  collected: DATES[schoolId] ?? null,
});

/** The school's housing site and the date its room data was collected. */
export function schoolSource(schoolId: string): Source | null {
  const s = SOURCE_MAP[schoolId];
  return s ? source(s.housing, schoolId) : null;
}

/** The hall's own housing page where the source names one, else the school's housing site. */
export function hallSource(schoolId: string, dormId: string): Source | null {
  const s = SOURCE_MAP[schoolId];
  return s ? source(s.halls[dormId] ?? s.housing, schoolId) : null;
}

/** The hall's own official page, when the source names one (for Residence.url). */
export function officialHallUrl(schoolId: string, dormId: string): string | undefined {
  return SOURCE_MAP[schoolId]?.halls[dormId];
}

export const hallShort = (name: string) => name.replace(/\s+(Hall|House|Residence Hall|Residence)$/i, "");
const familyLabel: Record<string, string> = { Single: "single", Double: "double", Triple: "triple", Quad: "quad", Suite: "suite" };

/** "A or B", "A, B and 3 more". */
export const names = (halls: string[]) =>
  halls.length <= 2 ? halls.join(" or ") : `${halls.slice(0, 2).join(", ")} and ${halls.length - 2} more`;

export type Placed = { key: string; hall: string; type: string; l: number; w: number; href: string; sqft: number };

/** Up to a dozen distinct sizes (published, unless `keep` says otherwise), from the biggest down, for the one-scale wall. */
export function scaleWall(school: SchoolSummary, keep: (r: RoomSummary) => boolean = isPublished): Placed[] {
  const seen = new Set<string>();
  const all: Placed[] = [];
  for (const d of school.dorms)
    for (const r of d.rooms) {
      if (!keep(r)) continue;
      const l = Math.max(r.length_ft!, r.width_ft!);
      const w = Math.min(r.length_ft!, r.width_ft!);
      const key = `${l.toFixed(1)}x${w.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ key, hall: hallShort(d.name), type: formatRoomType(r.type), l, w, href: `/colleges/${school.id}/${d.id}`, sqft: sqFtOf(r) ?? Math.round(l * w) });
    }
  all.sort((a, b) => b.l * b.w - a.l * a.w);
  if (all.length <= 11) return all;
  // keep the extremes and an even spread between them
  const pick: Placed[] = [];
  for (let i = 0; i < 11; i++) pick.push(all[Math.round((i * (all.length - 1)) / 10)]);
  return [...new Map(pick.map((p) => [p.key, p])).values()];
}

/** The room type with the widest spread of published sizes, grouped by size. */
export function spread(school: SchoolSummary) {
  const byFam = new Map<string, Map<string, { l: number; w: number; sqft: number; halls: string[]; type: string }>>();
  for (const d of school.dorms)
    for (const r of d.rooms as RoomSummary[]) {
      // Same rule as /dorm-room-size: published, and a room rather than a whole apartment.
      if (!isDormRoom(r, d.name)) continue;
      const fam = roomFamily(r.type);
      if (!["Double", "Single", "Triple"].includes(fam)) continue;
      const l = Math.max(r.length_ft!, r.width_ft!);
      const w = Math.min(r.length_ft!, r.width_ft!);
      const key = `${l.toFixed(1)}x${w.toFixed(1)}`;
      const m = byFam.get(fam) ?? new Map();
      const g = m.get(key) ?? { l, w, sqft: sqFtOf(r) ?? Math.round(l * w), halls: [], type: formatRoomType(r.type) };
      if (!g.halls.includes(hallShort(d.name))) g.halls.push(hallShort(d.name));
      m.set(key, g);
      byFam.set(fam, m);
    }
  const order = ["Double", "Single", "Triple"];
  const fam = order.find((f) => (byFam.get(f)?.size ?? 0) >= 3);
  if (!fam) return null;
  let groups = [...byFam.get(fam)!.values()].sort((a, b) => b.sqft - a.sqft);
  if (groups[0].sqft === groups[groups.length - 1].sqft) return null;
  if (groups.length > 9) {
    const g = groups;
    groups = [...new Set(Array.from({ length: 9 }, (_, i) => g[Math.round((i * (g.length - 1)) / 8)]))];
  }
  return { family: familyLabel[fam], groups };
}

/**
 * The one-sentence answer for a school page: how far its published room sizes
 * range, or, when it publishes none, that every size is an estimate. Null when
 * neither says anything useful.
 */
export function schoolSummary(school: SchoolSummary, short: string, published: number): string | null {
  const s = spread(school);
  if (s) {
    const big = s.groups[0];
    const small = s.groups[s.groups.length - 1];
    return `Published ${s.family}s here run from ${small.sqft} sq ft at ${names(small.halls)} to ${big.sqft} sq ft at ${names(big.halls)}.`;
  }
  if (published === 0) return `${short} doesn't publish room sizes, so every size here is an estimate from similar rooms, clearly marked.`;
  return null;
}

// A standard double: not an oblong, L-shaped, super, suite or alcove room, at least 9 ft
// across, and no more than twice as long as it is wide.
const NOT_STANDARD = /oblong|l[\s-]?shape|super\s?double|suite|alcove/i;
function standardDouble(r: RoomSummary): boolean {
  const l = Math.max(r.length_ft!, r.width_ft!);
  const w = Math.min(r.length_ft!, r.width_ft!);
  return !NOT_STANDARD.test(`${r.type} ${r.label ?? ""}`) && w >= 9 && l / w <= 2;
}

/**
 * The typical double: the most common standard double (rooms with identical length × width
 * counted together), ties broken by the size closest to the standard doubles' median sq ft.
 * Null when no published double is standard; the answer then gives square feet only.
 */
export function typicalDouble(doubles: RoomSummary[]): { l: number; w: number; sqft: number } | null {
  const groups = new Map<string, { l: number; w: number; sqft: number; count: number }>();
  for (const r of doubles.filter(standardDouble)) {
    const l = Math.max(r.length_ft!, r.width_ft!);
    const w = Math.min(r.length_ft!, r.width_ft!);
    const key = `${l.toFixed(1)}x${w.toFixed(1)}`;
    const g = groups.get(key) ?? { l, w, sqft: sqFtOf(r)!, count: 0 };
    g.count++;
    groups.set(key, g);
  }
  if (!groups.size) return null;
  const sizes = [...groups.values()].flatMap((g) => Array<number>(g.count).fill(g.sqft)).sort((a, b) => a - b);
  const median = sizes.length % 2 ? sizes[sizes.length >> 1] : (sizes[sizes.length / 2 - 1] + sizes[sizes.length / 2]) / 2;
  return [...groups.values()].sort((a, b) => b.count - a.count || Math.abs(a.sqft - median) - Math.abs(b.sqft - median))[0];
}

/**
 * The answer a school page opens with: its typical published double (else single, else
 * triple) and their range, from the same rooms as spread() and /dorm-room-size (published,
 * and a room rather than a whole apartment). For doubles "typical" is typicalDouble(); a
 * school whose doubles are all non-standard gets the doubles' median square feet only. For
 * singles and triples it's the real room at the middle of their sizes, so its length ×
 * width and square feet agree. A school with none of those gets the estimate wording.
 * `family` says which kind the answer is about (null for none).
 */
export function schoolAnswer(school: SchoolSummary, short: string, published: number): { family: string | null; lead: string; rest: string } {
  for (const fam of ["Double", "Single", "Triple"]) {
    const rooms = school.dorms
      .flatMap((d) => d.rooms.filter((r) => isDormRoom(r, d.name) && roomFamily(r.type) === fam))
      .sort((a, b) => sqFtOf(a)! - sqFtOf(b)!);
    if (!rooms.length) continue;
    const f = familyLabel[fam];
    const mid = rooms[(rooms.length - 1) >> 1];
    const min = sqFtOf(rooms[0])!;
    const max = sqFtOf(rooms[rooms.length - 1])!;
    let lead = `Typical ${short} ${f}: ${ft(Math.max(mid.length_ft!, mid.width_ft!))} × ${ft(Math.min(mid.length_ft!, mid.width_ft!))} ft, ${sqFtOf(mid)} sq ft.`;
    if (fam === "Double") {
      const t = typicalDouble(rooms);
      lead = t ? `Typical ${short} double: ${ft(t.l)} × ${ft(t.w)} ft, ${t.sqft} sq ft.` : `Typical ${short} double: ${sqFtOf(mid)} sq ft.`;
    }
    return {
      family: f,
      lead,
      rest:
        rooms.length === 1
          ? `It's the only ${f} with a published size.`
          : min === max
            ? `All ${rooms.length} published ${f}s are ${min} sq ft.`
            : `Published ${f}s range from ${min} to ${max} sq ft.`,
    };
  }
  return published > 0
    ? { family: null, lead: `${short} publishes sizes for ${published} room type${published === 1 ? "" : "s"}.`, rest: "Other sizes here are estimates from similar rooms, clearly marked." }
    : { family: null, lead: `${short} doesn't publish room sizes.`, rest: "Every size here is an estimate from similar rooms, clearly marked." };
}

export type RoomRow = {
  name: string;
  occupants: number | null;
  dims: string | null;
  sqft: number | null;
  bed: string;
  status: "Published" | "Estimated" | "Not published";
};

/** One row per room type, as the hall page's table and Markdown view list them. */
export function roomRows(dorm: DormSummary): RoomRow[] {
  return dorm.rooms.map((r) => ({
    name: roomName(r),
    occupants: r.occupants ?? null,
    dims: hasDims(r) ? `${ft(Math.max(r.length_ft!, r.width_ft!))} × ${ft(Math.min(r.length_ft!, r.width_ft!))} ft` : null,
    sqft: sqFtOf(r),
    bed: bedName(r.bed_size),
    status: isPublished(r) ? "Published" : r.dims_estimated ? "Estimated" : "Not published",
  }));
}
