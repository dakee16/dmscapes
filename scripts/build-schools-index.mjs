// Condenses data/schools/*.json (3-14k lines each, full sourcing detail) into
// lib/schools-index.json, the compact index the planner UI actually ships.
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
// their dimensions from the median of *published* rooms that resemble them.
// Median (not mean) so a couple of unusual rooms can't drag the estimate.
// Estimated rooms are flagged (dims_estimated) so the UI labels the size
// honestly instead of passing a guess off as official.
//
// Matching is tiered, most precise first, because room_type slugs are spelled
// inconsistently across schools ("double" vs "traditional_double" vs
// "premium_single"), an exact-slug-only match left ~228 rooms unestimated:
//   1. exact room_type slug          (a "double" learns from published doubles)
//   2. category + occupancy bucket    ("apartment:1" so a studio isn't sized
//                                       like a roomy traditional single)
//   3. occupancy alone                (last resort when the bucket is thin)
// Occupancy comes from the structured `occupants` count first (present on
// nearly every room), the slug only as a fallback. Category keeps apartments
// and suites from being sized like standard dorm rooms.
const MIN_BUCKET = 3; // need a few samples before a broad-bucket median means much

function occupancyOf(r) {
  const o = r.occupants;
  if (typeof o === "number" && o >= 1 && o <= 8) return o;
  const t = r.room_type ?? "";
  if (/quad|four|(^|_)4(_|$)/.test(t)) return 4;
  if (/triple|three|(^|_)3(_|$)/.test(t)) return 3;
  if (/double|two|(^|_)2(_|$)/.test(t)) return 2;
  if (/single|one|(^|_)1(_|$)/.test(t)) return 1;
  return null;
}
const categoryOf = (type) =>
  /apart|studio|\bapt\b|efficien/.test(type ?? "")
    ? "apartment"
    : /suite/.test(type ?? "")
      ? "suite"
      : "standard";

const bySlug = new Map(); // room_type -> { L:[], W:[] }
const byCatOcc = new Map(); // "category:occupancy" -> { L:[], W:[] }
const byOcc = new Map(); // "occupancy" -> { L:[], W:[] }
const add = (map, key, L, W) => {
  if (key == null) return;
  const g = map.get(key) ?? { L: [], W: [] };
  g.L.push(L);
  g.W.push(W);
  map.set(key, g);
};
for (const s of sources) {
  for (const d of s.dorms ?? []) {
    for (const r of d.rooms ?? []) {
      const dim = r.dimensions ?? {};
      if (!dim.length_ft || !dim.width_ft) continue;
      const occ = occupancyOf(r);
      add(bySlug, r.room_type, dim.length_ft, dim.width_ft);
      if (occ != null) {
        add(byCatOcc, `${categoryOf(r.room_type)}:${occ}`, dim.length_ft, dim.width_ft);
        add(byOcc, String(occ), dim.length_ft, dim.width_ft);
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
const medianDims = (g) => ({ length_ft: median(g.L), width_ft: median(g.W) });

/** Best-fit dims for a room with no published size, or null if nothing fits. */
function estimateDims(r) {
  const slug = bySlug.get(r.room_type);
  if (slug) return medianDims(slug); // tier 1: exact room type
  const occ = occupancyOf(r);
  if (occ != null) {
    const catOcc = byCatOcc.get(`${categoryOf(r.room_type)}:${occ}`);
    if (catOcc && catOcc.L.length >= MIN_BUCKET) return medianDims(catOcc); // tier 2
    const occOnly = byOcc.get(String(occ));
    if (occOnly && occOnly.L.length >= MIN_BUCKET) return medianDims(occOnly); // tier 3
  }
  return null;
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
      // Only estimate when the size is missing AND we have comparable rooms to
      // learn from; otherwise leave null and let the user enter dims manually.
      const est = published ? null : estimateDims(r);
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
    // Hand-authored acronyms/alternate names so the selector matches "psu",
    // "ucla", etc. — not just the full name (see searchSchools in lib/schools).
    aliases: s.aliases ?? [],
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
