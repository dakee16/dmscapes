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
