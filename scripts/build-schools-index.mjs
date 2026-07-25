// Condenses data/schools/*.json (3–14k lines each, full sourcing detail) into
// lib/schools-index.json — the compact index the planner UI actually ships.
// Rerun after editing school data: node scripts/build-schools-index.mjs
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "data", "schools");
const OUT = path.join(process.cwd(), "lib", "schools-index.json");

// Load every school file once so we can compute catalog-wide fallbacks before
// emitting any room.
const sources = fs
  .readdirSync(SRC)
  .sort()
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8")));

// ---- Best-fit (estimated) dimensions ---------------------------------------
// Rooms whose school doesn't publish a size still get a usable plan: we estimate
// their dimensions from the median of every *published* room of the same
// room_type across the entire catalog. Median (not mean) so a couple of unusual
// rooms can't drag the estimate. Estimated rooms are flagged (dims_estimated)
// so the UI labels the size honestly instead of passing a guess off as official.
const byType = new Map(); // room_type -> { lengths: number[], widths: number[] }
for (const s of sources) {
  for (const d of s.dorms ?? []) {
    for (const r of d.rooms ?? []) {
      const dim = r.dimensions ?? {};
      if (dim.length_ft && dim.width_ft) {
        const g = byType.get(r.room_type) ?? { lengths: [], widths: [] };
        g.lengths.push(dim.length_ft);
        g.widths.push(dim.width_ft);
        byType.set(r.room_type, g);
      }
    }
  }
}

const median = (nums) => {
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  const m = a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  return Math.round(m * 2) / 2; // snap to the nearest half-foot
};

const estimateFor = new Map(); // room_type -> { length_ft, width_ft }
for (const [type, g] of byType) {
  estimateFor.set(type, { length_ft: median(g.lengths), width_ft: median(g.widths) });
}

const schools = [];
for (const s of sources) {
  const dorms = [];
  for (const d of s.dorms ?? []) {
    const rooms = [];
    for (const r of d.rooms ?? []) {
      const dim = r.dimensions ?? {};
      const closet = r.closet ?? {};
      const published = Boolean(dim.length_ft && dim.width_ft);
      // Only estimate when the size is missing AND we have same-type rooms to
      // learn from; otherwise leave null and let the user enter dims manually.
      const est = published ? null : estimateFor.get(r.room_type) ?? null;
      rooms.push({
        type: r.room_type,
        label: r.room_type_official ?? r.room_type,
        occupants: r.occupants ?? null,
        length_ft: published ? dim.length_ft : est?.length_ft ?? null,
        width_ft: published ? dim.width_ft : est?.width_ft ?? null,
        sqft: r.floor_area_sqft ?? null,
        // Twin XL is the near-universal US dorm default; only exceptions carry
        // bed_size in the source data (see lib/bedding.ts for how it's used).
        bed_size: r.bed_size ?? "twin_xl",
        // Present only when the size is a same-type estimate, so the UI can be
        // honest about it. Absent for published (real) dimensions.
        ...(est ? { dims_estimated: true } : {}),
        closet:
          closet.width_ft && closet.depth_ft
            ? { width_ft: closet.width_ft, depth_ft: closet.depth_ft, wall: closet.wall ?? null }
            : null,
      });
    }
    if (rooms.length === 0) continue;
    dorms.push({ id: d.dorm_id, name: d.dorm_name, rooms });
  }
  schools.push({
    id: s.college_id,
    name: s.college_name,
    city: s.city ?? null,
    state: s.state ?? null,
    dorms,
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(schools));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
const allRooms = schools.flatMap((s) => s.dorms.flatMap((d) => d.rooms));
const published = allRooms.filter((r) => r.length_ft && r.width_ft && !r.dims_estimated).length;
const estimated = allRooms.filter((r) => r.dims_estimated).length;
const unsized = allRooms.length - published - estimated;
console.log(
  `${schools.length} schools, ${allRooms.length} rooms ` +
    `(${published} published, ${estimated} estimated, ${unsized} unsized) -> ${OUT} (${kb} KB)`
);
