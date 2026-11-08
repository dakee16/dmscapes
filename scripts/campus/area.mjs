// Proposes a school's campus area for scripts/campus/config/<id>.json: OpenStreetMap university
// or college outlines whose names match the school, with their bounding boxes.
//   node scripts/campus/area.mjs ohio-state            list the candidates
//   node scripts/campus/area.mjs ohio-state --write    also start the config from the best one
// A person still confirms the pick on the map (the dev review page draws the outline) before
// fetch.mjs runs: a big university can have several outlines (medical campus, research park).
// One Nominatim request per school, with a User-Agent naming dormscape.us (its usage policy).
// --write never overwrites a config. The draft has no building-code list ("codes": null) and a
// TODO in "noCodes", which check-campus fails until the code list is researched or ruled out.
import fs from "node:fs";

const UA = "dormscape-campus-data/1.0 (+https://dormscape.us)";
const id = process.argv[2];
if (!id) throw new Error("usage: node scripts/campus/area.mjs <collegeId> [--write]");
const write = process.argv.includes("--write");
const school = JSON.parse(fs.readFileSync(`data/schools/${id}.json`, "utf8"));
const CONFIG = `scripts/campus/config/${id}.json`;

// "The Pennsylvania State University (University Park)" → "Pennsylvania State University"
const name = school.college_name.replace(/\s*\(.*?\)\s*/g, " ").replace(/^the\s+/i, "").trim();
const url = new URL("https://nominatim.openstreetmap.org/search");
url.search = new URLSearchParams({ q: name, format: "jsonv2", countrycodes: "us", limit: "15", extratags: "1" }).toString();
const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
if (!res.ok) throw new Error(`Nominatim ${res.status}: ${(await res.text()).slice(0, 200)}`);
const hits = await res.json();

const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["the", "university", "college", "of", "and"].includes(w)));
const want = words(name);
const near = [school.city, school.state].filter(Boolean).map((s) => s.toLowerCase());
const candidates = hits
  .filter((h) => (h.osm_type === "relation" || h.osm_type === "way") && ["university", "college"].includes(h.type))
  .map((h) => {
    const [s, n, w, e] = h.boundingbox.map(Number);
    const got = words(h.name || h.display_name);
    const shared = [...want].filter((x) => got.has(x)).length;
    const place = near.filter((p) => h.display_name.toLowerCase().includes(p)).length;
    // Rough size, to tell a main campus from an annex.
    const km2 = (n - s) * 111.2 * ((e - w) * 111.2 * Math.cos((((n + s) / 2) * Math.PI) / 180));
    return { osm: `${h.osm_type}/${h.osm_id}`, name: h.name || h.display_name.split(",")[0], where: h.display_name, bbox: [s, w, n, e], km2, score: shared * 10 + place * 3 + Math.min(km2, 5) };
  })
  .sort((a, b) => b.score - a.score);

console.log(`${id}: "${name}" (${[school.city, school.state].filter(Boolean).join(", ")}), ${school.dorms.length} halls`);
if (!candidates.length) {
  console.log("  no university or college outline found: find it on openstreetmap.org and fill config.area by hand");
  process.exit(1);
}
for (const c of candidates.slice(0, 6)) {
  console.log(`  ${c.osm.padEnd(18)} ${c.km2.toFixed(2).padStart(6)} km²  ${c.name}  —  ${c.where.split(",").slice(1, 4).join(",").trim()}`);
}

if (write) {
  if (fs.existsSync(CONFIG)) {
    console.log(`  ${CONFIG} exists; not overwritten`);
  } else {
    const best = candidates[0];
    const config = {
      collegeId: id,
      area: { osm: best.osm, bbox: best.bbox.map((v) => Math.round(v * 1e5) / 1e5) },
      walkMarginM: 400,
      walkingSpeed: 1.35,
      codes: null,
      noCodes: "TODO: name the registrar or facilities pages searched for a building-code list, or replace codes with the list's source",
    };
    fs.writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`  wrote ${CONFIG} from ${best.osm} (${best.name}); confirm the outline on the review page`);
  }
}
