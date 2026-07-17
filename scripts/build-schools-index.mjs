// Condenses data/schools/*.json (3–14k lines each, full sourcing detail) into
// lib/schools-index.json — the compact index the planner UI actually ships.
// Rerun after editing school data: node scripts/build-schools-index.mjs
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "data", "schools");
const OUT = path.join(process.cwd(), "lib", "schools-index.json");

const schools = [];
for (const file of fs.readdirSync(SRC).sort()) {
  if (!file.endsWith(".json")) continue;
  const s = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
  const dorms = [];
  for (const d of s.dorms ?? []) {
    const rooms = [];
    for (const r of d.rooms ?? []) {
      const dim = r.dimensions ?? {};
      const closet = r.closet ?? {};
      rooms.push({
        type: r.room_type,
        label: r.room_type_official ?? r.room_type,
        occupants: r.occupants ?? null,
        length_ft: dim.length_ft ?? null,
        width_ft: dim.width_ft ?? null,
        sqft: r.floor_area_sqft ?? null,
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
const rooms = schools.reduce((n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0), 0);
const withDims = schools.reduce(
  (n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.filter((r) => r.length_ft && r.width_ft).length, 0),
  0
);
console.log(`${schools.length} schools, ${rooms} rooms (${withDims} with dims) -> ${OUT} (${kb} KB)`);
