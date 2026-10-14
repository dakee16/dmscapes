import type { RoomSummary, SchoolSummary } from "./types";

// The numbers behind /dorm-room-size, computed from the shipped school index so
// the page can never drift from the data. Only sizes a school publishes count
// (estimates are left out), and listings that describe a whole apartment rather
// than a room are dropped. Pure, with type-only imports, so
// scripts/check-dorm-sizes.cjs can run it directly.

/** Above this, a listing is a whole apartment or suite, not a room. */
export const MAX_SQFT_PER_PERSON = 300;
/** A school needs this many published doubles to get its own row. */
export const MIN_SCHOOL_ROOMS = 3;

export interface SizeRow {
  schoolId: string;
  schoolName: string;
  hallId: string;
  hallName: string;
  occupants: number;
  lengthFt: number;
  widthFt: number;
  sqft: number;
  twinXl: boolean;
}

export interface TypeStats {
  occupants: number;
  rooms: number;
  schools: number;
  /**
   * A real published size whose area is closest to the median (within 3%,
   * at two or more schools), so length x width matches the area shown.
   * Falls back to the median length and width.
   */
  lengthFt: number;
  widthFt: number;
  median: number;
  mean: number;
  /** the middle half of rooms falls between these */
  p25: number;
  p75: number;
  perPerson: number;
}

export interface SchoolDoubles {
  schoolId: string;
  schoolName: string;
  rooms: number;
  median: number;
  min: number;
  max: number;
}

/** Linear-interpolated quantile of an ascending list (p in 0..1). */
export function quantile(sorted: number[], p: number): number {
  const k = (sorted.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo);
}

/** A school-published size for a dorm room (same "published" rule as lib/room-preview). */
export function isDormRoom(r: RoomSummary, hallName: string): boolean {
  // Singles, doubles and triples: quads are mostly whole suites.
  if (!r.length_ft || !r.width_ft || r.dims_estimated || !r.occupants || r.occupants > 3) return false;
  if (/graduate|family/i.test(hallName)) return false;
  if (/studio|efficiency/i.test(`${r.type} ${r.label ?? ""}`)) return false;
  const sqft = r.sqft ?? Math.round(r.length_ft * r.width_ft);
  return sqft / r.occupants <= MAX_SQFT_PER_PERSON;
}

const sortNum = (v: number[]) => [...v].sort((a, b) => a - b);

export function dormSizeStats(schools: SchoolSummary[]) {
  const rows: SizeRow[] = schools.flatMap((s) =>
    s.dorms.flatMap((d) =>
      d.rooms
        .filter((r) => isDormRoom(r, d.name))
        .map((r) => ({
          schoolId: s.id,
          schoolName: s.name,
          hallId: d.id,
          hallName: d.name,
          occupants: r.occupants!,
          lengthFt: Math.max(r.length_ft!, r.width_ft!),
          widthFt: Math.min(r.length_ft!, r.width_ft!),
          sqft: r.sqft ?? Math.round(r.length_ft! * r.width_ft!),
          twinXl: r.bed_size === "twin_xl",
        }))
    )
  );

  const byType: TypeStats[] = [1, 2, 3]
    .map((occupants) => {
      const g = rows.filter((r) => r.occupants === occupants);
      if (!g.length) return null;
      const sq = sortNum(g.map((r) => r.sqft));
      const median = quantile(sq, 0.5);
      const near = new Map<string, { lengthFt: number; widthFt: number; rooms: number; schools: Set<string> }>();
      for (const r of g) {
        if (Math.abs(r.lengthFt * r.widthFt - median) > median * 0.03) continue;
        const key = `${r.lengthFt}x${r.widthFt}`;
        const c = near.get(key) ?? { lengthFt: r.lengthFt, widthFt: r.widthFt, rooms: 0, schools: new Set<string>() };
        c.rooms++;
        c.schools.add(r.schoolId);
        near.set(key, c);
      }
      const size = [...near.values()]
        .filter((c) => c.schools.size >= 2)
        .sort((a, b) => Math.abs(a.lengthFt * a.widthFt - median) - Math.abs(b.lengthFt * b.widthFt - median) || b.rooms - a.rooms)[0];
      return {
        occupants,
        rooms: g.length,
        schools: new Set(g.map((r) => r.schoolId)).size,
        lengthFt: size?.lengthFt ?? quantile(sortNum(g.map((r) => r.lengthFt)), 0.5),
        widthFt: size?.widthFt ?? quantile(sortNum(g.map((r) => r.widthFt)), 0.5),
        median,
        mean: sq.reduce((a, b) => a + b, 0) / sq.length,
        p25: quantile(sq, 0.25),
        p75: quantile(sq, 0.75),
        perPerson: median / occupants,
      };
    })
    .filter((t): t is TypeStats => t !== null);

  // The exact sizes published most often, e.g. a 16 x 12 ft double.
  const counts = new Map<string, { occupants: number; lengthFt: number; widthFt: number; rooms: number }>();
  for (const r of rows) {
    const key = `${r.occupants}:${r.lengthFt}:${r.widthFt}`;
    const c = counts.get(key) ?? { occupants: r.occupants, lengthFt: r.lengthFt, widthFt: r.widthFt, rooms: 0 };
    c.rooms++;
    counts.set(key, c);
  }
  const commonSizes = [...counts.values()].sort((a, b) => b.rooms - a.rooms).slice(0, 5);

  const doublesBySchool: SchoolDoubles[] = schools
    .map((s) => {
      const sq = sortNum(rows.filter((r) => r.schoolId === s.id && r.occupants === 2).map((r) => r.sqft));
      return sq.length >= MIN_SCHOOL_ROOMS
        ? { schoolId: s.id, schoolName: s.name, rooms: sq.length, median: quantile(sq, 0.5), min: sq[0], max: sq[sq.length - 1] }
        : null;
    })
    .filter((x): x is SchoolDoubles => x !== null)
    .sort((a, b) => b.median - a.median || a.schoolName.localeCompare(b.schoolName));

  return {
    rooms: rows.length,
    schools: new Set(rows.map((r) => r.schoolId)).size,
    halls: new Set(rows.map((r) => `${r.schoolId}/${r.hallId}`)).size,
    twinXlShare: rows.filter((r) => r.twinXl).length / rows.length,
    byType,
    commonSizes,
    doublesBySchool,
  };
}

export type DormSizeStats = ReturnType<typeof dormSizeStats>;
