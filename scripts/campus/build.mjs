// Builds Hall Finder campus data from the fetch cache (scripts/campus/fetch.mjs), the
// school file, the campus config and the manual overrides. No network.
//   node scripts/campus/build.mjs penn-state
// Writes:
//   data/campus/<id>.json                    client-safe: sources, bounds, hall pins (with each
//                                            hall's nearest dining, library and gym), places
//   data/campus/<id>.minutes.json            server only: { places: [ids], halls: { dormId: [minutes] } }
//   data/campus/paths/<id>/<dormId>.json     server only: { placeId: encoded polyline }
//   data/campus/index.json                   the pilot list: adds <id>
// data/campus/overrides/<id>.json (pins, year tags, place codes/aliases/kind) wins over OSM.
import fs from "node:fs";
import path from "node:path";

const id = process.argv[2];
if (!id) throw new Error("usage: node scripts/campus/build.mjs <collegeId>");
const read = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback);
const school = read(`data/schools/${id}.json`);
const config = read(`scripts/campus/config/${id}.json`);
const OVERRIDES = `data/campus/overrides/${id}.json`;
const overrides = read(OVERRIDES, {});
const cache = (name) => read(`scripts/campus/cache/${id}/${name}.json`, null);
const osm = cache("buildings");
const walk = cache("walk");
const codeList = cache("codes");
const codeFile = config.codes?.file ? read(config.codes.file) : null;
if (!osm || !walk) throw new Error(`no cache for ${id}; run node scripts/campus/fetch.mjs ${id}`);

// ---- Geometry: local metres on a plane through the campus centre (error < 0.1% at campus scale)
const [S, W, N, E] = config.area.bbox;
const LAT0 = (S + N) / 2;
const LNG0 = (W + E) / 2;
const MY = (6371008.8 * Math.PI) / 180;
const MX = MY * Math.cos((LAT0 * Math.PI) / 180);
const xy = (lng, lat) => [(lng - LNG0) * MX, (lat - LAT0) * MY];
const lngLat = ([x, y]) => [LNG0 + x / MX, LAT0 + y / MY];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// Closest point to p on segment ab: { q, t, d }.
function project(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  const q = [a[0] + t * dx, a[1] + t * dy];
  return { q, t, d: dist(p, q) };
}

function ringInfo(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  return a ? { center: [cx / (3 * a), cy / (3 * a)], area: Math.abs(a / 2) } : { center: ring[0], area: 0 };
}

function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inBuilding = (p, b) => b.rings.some((r) => inRing(p, r));

// Even-odd over loose segments: a relation's outer and inner rings arrive split across member
// ways, but every edge crossing still counts once, so no stitching is needed.
function inLines(p, lines) {
  let inside = false;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [xi, yi] = line[i];
      const [xj, yj] = line[i - 1];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// Douglas–Peucker on [x, y] points.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = project(pts[i], pts[a], pts[b]).d;
      if (d > max) [max, at] = [d, i];
    }
    if (max > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// Google encoded polyline, precision 5, from [lng, lat] points.
function encode(points) {
  const chunk = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    for (; v >= 0x20; v >>= 5) s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    return s + String.fromCharCode(v + 63);
  };
  let out = "", plat = 0, plng = 0;
  for (const [lng, lat] of points) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    out += chunk(la - plat) + chunk(ln - plng);
    [plat, plng] = [la, ln];
  }
  return out;
}

// ---- Names
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const core = (s) => norm(s).replace(/\b(the|residence|hall|house|building|bldg)\b/g, " ").replace(/\s+/g, " ").trim();
const OSM_NAME_KEYS = ["name", "official_name", "alt_name", "short_name", "old_name", "loc_name"];
const osmNames = (tags) => OSM_NAME_KEYS.flatMap((k) => (tags[k] ?? "").split(";")).map((s) => s.trim()).filter(Boolean);
const slug = (s) => norm(s).replace(/ /g, "-");
const count = (list, key) => list.reduce((c, v) => ((c[key(v)] = (c[key(v)] ?? 0) + 1), c), {});
const uniqBy = (list, key) => {
  const seen = new Set();
  return list.filter((v) => v && !seen.has(key(v)) && seen.add(key(v)));
};

// ---- OSM buildings
function toBuildings(elements) {
  const skeletons = new Map(elements.filter((e) => e.type === "way" && !e.tags).map((e) => [e.id, e.nodes]));
  const entranceNodes = new Map(
    elements
      .filter((e) => e.type === "node" && !["no", "emergency"].includes(e.tags?.entrance) && !["private", "no"].includes(e.tags?.access))
      .map((e) => [e.id, xy(e.lon, e.lat)]),
  );
  return elements
  .filter((e) => (e.type === "way" || e.type === "relation") && e.tags?.building)
  .map((e) => {
    const geoms = e.type === "way" ? [e.geometry] : e.members.filter((m) => m.type === "way" && m.role !== "inner" && m.geometry).map((m) => m.geometry);
    const rings = geoms.filter((g) => g?.length > 2).map((g) => g.map((p) => xy(p.lon, p.lat)));
    const nodeIds = e.type === "way" ? e.nodes : e.members.filter((m) => m.type === "way").flatMap((m) => skeletons.get(m.ref) ?? []);
    const largest = rings.map(ringInfo).sort((a, b) => b.area - a.area)[0];
    return {
      osm: `${e.type}/${e.id}`,
      tags: e.tags,
      rings,
      center: largest?.center,
      area: rings.reduce((s, r) => s + ringInfo(r).area, 0),
      entrances: [...new Set(nodeIds)].filter((n) => entranceNodes.has(n)).map((n) => entranceNodes.get(n)),
    };
  })
  .filter((b) => b.center);
}
const buildings = toBuildings(osm.elements);
// Unnamed buildings inside the outline (fetched only when the official list has locations).
const unnamed = toBuildings(cache("unnamed")?.elements ?? []);

// Campus outline (fetched with the buildings). Places sit inside it or appear on the official list.
const [areaType, areaId] = (config.area.osm ?? "").split("/");
const outlineEl = osm.elements.find((e) => e.type === areaType && String(e.id) === areaId);
const outline = outlineEl
  ? (areaType === "way" ? [outlineEl.geometry] : outlineEl.members.filter((m) => m.type === "way").map((m) => m.geometry))
      .filter(Boolean)
      .map((g) => g.map((p) => xy(p.lon, p.lat)))
  : null;
if (config.area.osm && !outline) console.warn(`no outline for ${config.area.osm} in the cache; every building counts as on campus`);
const inCampus = (p) => !outline || inLines(p, outline);

// ---- Walking graph (CSR adjacency); edge weight = metres, steps x1.5
const wnodes = walk.elements.filter((e) => e.type === "node");
const nodeIndex = new Map(wnodes.map((e, i) => [e.id, i]));
const P = wnodes.map((e) => xy(e.lon, e.lat));
const eu = [], ev = [], ew = [], ef = [];
for (const way of walk.elements) {
  if (way.type !== "way") continue;
  const factor = way.tags.highway === "steps" ? 1.5 : 1;
  for (let i = 1; i < way.nodes.length; i++) {
    const u = nodeIndex.get(way.nodes[i - 1]);
    const v = nodeIndex.get(way.nodes[i]);
    if (u === undefined || v === undefined || u === v) continue;
    eu.push(u); ev.push(v); ef.push(factor); ew.push(dist(P[u], P[v]) * factor);
  }
}
const nNodes = P.length;
const head = new Int32Array(nNodes + 1);
for (let i = 0; i < eu.length; i++) head[eu[i] + 1]++, head[ev[i] + 1]++;
for (let i = 0; i < nNodes; i++) head[i + 1] += head[i];
const adj = new Int32Array(head[nNodes]);
const adjW = new Float64Array(head[nNodes]);
{
  const fill = head.slice(0, nNodes);
  for (let i = 0; i < eu.length; i++) {
    adj[fill[eu[i]]] = ev[i]; adjW[fill[eu[i]]++] = ew[i];
    adj[fill[ev[i]]] = eu[i]; adjW[fill[ev[i]]++] = ew[i];
  }
}

// The campus network is the largest connected component; buildings only snap onto it, never onto
// an unconnected scrap of footway.
const comp = Int32Array.from({ length: nNodes }, (_, i) => i);
const find = (i) => {
  while (comp[i] !== i) i = comp[i] = comp[comp[i]];
  return i;
};
for (let i = 0; i < eu.length; i++) comp[find(eu[i])] = find(ev[i]);
const MAIN = Number(Object.entries(count(Array.from({ length: nNodes }, (_, i) => find(i)), String)).sort((a, b) => b[1] - a[1])[0]?.[0]);
const onMain = (i) => find(i) === MAIN;

// ---- Snapping. A seed is a graph node, the metres to reach it from the building, and the
// points walked from the building to it ("lead"). Entrances snap to the nearest edge within
// 40 m (both ends of that edge become seeds); otherwise the centroid's nearest node within 80 m.
// ponytail: brute-force nearest edge/node, O(points x edges), about a second per campus; add a grid index if one gets slow.
function snapEdge(p, max) {
  let best = null;
  for (let i = 0; i < eu.length; i++) {
    if (!onMain(eu[i])) continue;
    const r = project(p, P[eu[i]], P[ev[i]]);
    if (r.d <= max && (!best || r.d < best.d)) best = { ...r, i };
  }
  if (!best) return [];
  const len = dist(P[eu[best.i]], P[ev[best.i]]) * ef[best.i];
  const lead = [p, best.q];
  return [
    { node: eu[best.i], cost: best.d + best.t * len, lead },
    { node: ev[best.i], cost: best.d + (1 - best.t) * len, lead },
  ];
}
function snapNode(p, max) {
  let best = -1, bestD = max;
  for (let i = 0; i < nNodes; i++) {
    if (!onMain(i)) continue;
    const d = dist(p, P[i]);
    if (d <= bestD) [best, bestD] = [i, d];
  }
  return best < 0 ? [] : [{ node: best, cost: bestD, lead: [p] }];
}
function seedsFor(b, point = b.center) {
  const fromDoors = b ? b.entrances.flatMap((e) => snapEdge(e, 40)) : [];
  if (fromDoors.length) return { seeds: fromDoors, via: "entrance" };
  const fromCenter = snapNode(point, 80);
  return { seeds: fromCenter, via: fromCenter.length ? "centroid" : null };
}

// ---- Halls: OSM building by name, then by address, else a manual pin from the overrides.
// "821 E. Lemon Mall" = "821 Lemon Mall": suffixes spelled out, directions dropped (OSM often omits them).
const STREET_WORDS = { st: "street", rd: "road", dr: "drive", ave: "avenue", av: "avenue", blvd: "boulevard", ln: "lane", ct: "court", pl: "place", pkwy: "parkway", hwy: "highway" };
const DIRECTIONS = new Set(["e", "w", "n", "s", "east", "west", "north", "south", "sw", "se", "nw", "ne"]);
const addressKey = (num, street) => `${norm(num)} ${norm(street).split(" ").filter((w) => !DIRECTIONS.has(w)).map((w) => STREET_WORDS[w] ?? w).join(" ")}`;
const osmAddress = (t) => (t["addr:housenumber"] && t["addr:street"] ? addressKey(t["addr:housenumber"], t["addr:street"]) : null);
const largestFirst = (list) => [...list].sort((a, b) => b.area - a.area);

// Word match, the last name rule: every significant word of our name appears in the OSM name
// ("Saxon Suites" / "Saxon Residential Suites", "Botany Building" / "La Kretz Botany Building"),
// or, when bothWays, every word of a 2+ word OSM name appears in ours ("Ackerman Student Union" /
// "Ackerman Union"). OSM name and official_name only (short names are codes like "BUS"), and
// only when it picks out a single building; same-name parts collapse to the largest.
// The school's own name ("UCLA", "Arizona State") says nothing about which building.
const GENERIC = new Set([
  ...["the", "of", "at", "and", "for", "hall", "halls", "building", "bldg", "center", "centre", "laboratory", "laboratories", "lab", "residential", "residence", "university", "school", "college"],
  ...[school.college_name, ...(school.aliases ?? [])].flatMap((n) => norm(n).split(" ")),
]);
const words = (s) => norm(s).split(" ").filter((w) => w.length > 1 && !GENERIC.has(w));
// a inside b, with a covering at least 1/k of b ("Botany" / "La Kretz Botany" yes,
// "Mountain" / "Mountain Park Health Center Tempe Clinic" no).
const within = (a, b, k) => a.some((w) => /[a-z]{3}/.test(w)) && a.length * k >= b.length && a.every((w) => b.includes(w));
function byWords(names, list, bothWays) {
  const sets = names.map(words).filter((w) => w.length);
  // Our words inside the OSM name covering a third of it; the other way, the OSM words must
  // cover half of ours ("Mudd Hall" / "Seeley W. Mudd Building" yes, "Social Hall" / "School of
  // Human Evolution and Social Change" no).
  const tests = [(n, o) => within(n, o, 3), ...(bothWays ? [(n, o) => within(o, n, 2)] : [])];
  for (const fits of tests) {
    const hits = list.filter((b) => [b.tags.name, b.tags.official_name].some((on) => on && sets.some((n) => fits(n, words(on)))));
    if (hits.length && new Set(hits.map((b) => norm(b.tags.name))).size === 1) return largestFirst(hits)[0];
  }
  return null;
}

const hallBuildings = new Set();
const report = { ambiguous: [], unpinned: [], unsnapped: [], offCampus: [], noCodeOrAlias: [], beyondWalk: [], wordMatched: [], unreached: [] };
// Halls on another campus (config.excludeHalls, with the reason) aren't on this walking map.
const halls = school.dorms.filter((d) => !config.excludeHalls?.[d.dorm_id]).map((d) => {
  const ov = overrides.halls?.[d.dorm_id] ?? {};
  // "Hogan Hall & Ruggles Hall" is two buildings; either name finds it.
  const names = [d.dorm_name, d.dorm_name.replace(/\s*\(.*?\)\s*/g, " "), ...d.dorm_name.split(/\s+&\s+/)];
  let building = null, pin = null;
  if (ov.pin) {
    pin = "manual";
    const p = xy(...ov.pin);
    building = buildings.find((b) => inBuilding(p, b)) ?? null;
  } else {
    const full = new Set(names.map(norm));
    // A building's current name beats another's alt or former name (UF's Fletcher Hall has
    // old_name "North Hall", and North Hall is its own building).
    const byPrimary = buildings.filter((b) => full.has(norm(b.tags.name)));
    const byName = byPrimary.length ? byPrimary : buildings.filter((b) => osmNames(b.tags).some((n) => full.has(norm(n))));
    // "Frances Atherton Hall" is Atherton Hall.
    const byEnding = buildings.filter((b) => osmNames(b.tags).some((n) => [...full].some((f) => norm(n).endsWith(` ${f}`))));
    const cores = new Set(names.map(core).filter(Boolean));
    const byCore = buildings.filter((b) => osmNames(b.tags).some((n) => cores.has(core(n))));
    const addr = d.address?.match(/^\s*(\d+[a-z]?)\s+([^,]+)/i);
    const byAddress = addr ? buildings.filter((b) => osmAddress(b.tags) === addressKey(addr[1], addr[2])) : [];
    // Exact name, then exact address, then the looser name rules.
    if (byName.length) [building, pin] = [largestFirst(byName)[0], "name"];
    else if (byAddress.length) [building, pin] = [largestFirst(byAddress)[0], "address"];
    else if (byEnding.length === 1) [building, pin] = [byEnding[0], "name"];
    else if (byCore.length === 1) [building, pin] = [byCore[0], "name"];
    if (!building && byCore.length > 1) report.ambiguous.push(`${d.dorm_id}: ${byCore.map((b) => b.tags.name).join(" / ")}`);
  }
  if (building) hallBuildings.add(building);
  return { d, ov, names, pin, building };
});
// Second pass, once every exact match has claimed its building: the hall's words inside an
// unclaimed building's name (one way only, so "Nittany Apt Townhouse" can't take Nittany Hall).
for (const h of halls) {
  if (h.building || h.ov.pin) continue;
  h.building = byWords(h.names, buildings.filter((b) => !hallBuildings.has(b)), false);
  if (!h.building) continue;
  h.pin = "name";
  hallBuildings.add(h.building);
}
for (const h of halls) {
  h.at = h.ov.pin ? xy(...h.ov.pin) : h.building?.center;
  if (!h.at) report.unpinned.push(h.d.dorm_id);
  h.year = "year" in h.ov ? { year: h.ov.year, source: h.ov.yearSource ?? OVERRIDES } : config.years?.[h.d.dorm_id] ?? { year: null, source: null };
  h.snap = h.at ? seedsFor(h.building, h.at) : { seeds: [], via: null };
  if (h.at && !h.snap.via) report.unsnapped.push(`hall ${h.d.dorm_id}`);
}

// ---- Official building list (codes + aliases), joined to OSM buildings by footprint, then by name.
// Either an ArcGIS layer from the fetch cache (polygons) or a list read once into
// config/<id>.codes.json (names, sometimes a point).
const cf = config.codes?.fields;
const listed = (codeFile?.buildings ?? []).map((b) => ({
  name: b.name,
  code: b.code,
  aliases: [],
  rings: [],
  center: Number.isFinite(b.lng) ? xy(b.lng, b.lat) : null,
  area: 0,
}));
const official = listed.concat((codeList?.features ?? [])
  .filter((f) => f.geometry?.rings?.length)
  .map((f) => {
    const rings = f.geometry.rings.map((r) => r.map(([lng, lat]) => xy(lng, lat)));
    const { center, area } = rings.map(ringInfo).sort((a, b) => b.area - a.area)[0];
    const a = f.attributes;
    return {
      name: a[cf.name],
      code: a[cf.code]?.trim() || null,
      aliases: cf.aliases.flatMap((k) => String(a[k] ?? "").split(",")).map((s) => s.trim()).filter(Boolean),
      rings,
      center,
      area,
    };
  }));

// ---- Places: named OSM buildings in the campus area that aren't halls or outbuildings.
const NOT_PLACES = new Set(["dormitory", "residential", "apartments", "house", "detached", "semidetached_house", "terrace", "garage", "garages", "carport", "parking", "shed", "hut", "roof", "service", "transformer_tower", "water_tower", "silo", "barn", "cowshed", "stable", "farm_auxiliary", "greenhouse", "storage_tank", "bunker", "kiosk", "toilets", "ruins", "construction", "stadium", "grandstand"]);
const OUTBUILDING = /\b(bus|parking|garage|deck|substation|shed|shelter|barn|silo|kiosk|storage|greenhouse|hangar|heliport|pump ?house)\b/i;
function kindOf(t) {
  const name = t.name ?? "";
  if (t.amenity === "library" || t.building === "library" || /\blibrar(y|ies)\b/i.test(name)) return "library";
  // Dining halls, not every cafe or cart with a building outline. A name-only "commons" match
  // must not be tagged as something else (UF's commons are amenity=community_centre).
  if (t.amenity === "food_court" || /\b(dining|food district)\b/i.test(name) || (/\bcommons\b/i.test(name) && !t.amenity)) return "dining";
  if (["sports_centre", "fitness_centre", "sports_hall"].includes(t.leisure) || ["sports_hall", "sports_centre"].includes(t.building) || /\b(gym|gymnasium|fitness|recreation|natatorium|intramural)\b/i.test(name)) return "gym";
  return "academic";
}

const candidates = largestFirst(buildings.filter((b) => b.tags.name && !hallBuildings.has(b) && !NOT_PLACES.has(b.tags.building) && !OUTBUILDING.test(b.tags.name)));
const joined = new Map(candidates.map((b) => [b, []]));
// Word matches are the loosest join, so the report lists each for review.
function wordMatch(o, variants) {
  if (!o.code) return null;
  // A listed point keeps the match near it.
  const near = o.center ? candidates.filter((c) => dist(c.center, o.center) <= 150) : candidates;
  const b = byWords(variants, near, true);
  if (b) report.wordMatched.push(`${o.code} "${o.name}" = "${b.tags.name}"`);
  return b;
}
// An unnamed OSM building that an official footprint or point lands on takes the official name.
const fromList = new Map();
function namedFromList(u, o) {
  if (!fromList.has(u.osm)) {
    const b = { ...u, tags: { ...u.tags, name: o.name.replace(/\s*\(.*?\)\s*/g, " ").trim() } };
    fromList.set(u.osm, b);
    candidates.push(b);
    joined.set(b, []);
  }
  return fromList.get(u.osm);
}
const byOsm = new Map([...unnamed, ...candidates].map((b) => [b.osm, b]));
const sameCode = (b, code) => [b.tags.short_name, b.tags.alt_name, b.tags.ref].some((v) => v?.split(";").some((x) => x.trim().toUpperCase() === code.toUpperCase()));
const unjoined = [];
for (const o of official) {
  // Manual fix (overrides.codes): this code belongs to that OSM building, or to none.
  const forced = o.code && overrides.codes && o.code in overrides.codes ? overrides.codes[o.code] : undefined;
  if (forced !== undefined) {
    const b = forced && byOsm.get(forced);
    if (b) joined.get(b.tags.name ? b : namedFromList(b, o)).push(o);
    continue;
  }
  if (OUTBUILDING.test(o.name)) continue;
  // Either centroid inside the other footprint (a U-shaped building's centroid sits in its courtyard).
  // "Osmond Laboratory (I Thornton)", "Milbank Hall, Barnard"
  const variants = [o.name, o.name.replace(/\s*\(.*?\)\s*/g, " "), o.name.split(",")[0], ...o.aliases];
  const names = new Set(variants.map(norm));
  const cores = new Set(variants.map(core).filter(Boolean));
  // A hall's own entry ("Broadway Residence Hall") belongs to the hall, not to a place. Exact
  // and core names only: the word rule would hand "Willard" to E. Willard Miller Hall.
  const isHall = [...hallBuildings].some(
    (b) => (o.center && inBuilding(o.center, b)) || o.rings.some((r) => inRing(b.center, r)) || osmNames(b.tags).some((n) => names.has(norm(n)) || cores.has(core(n))),
  );
  if (isHall) continue;
  const host =
    candidates.find((b) => (o.center && inBuilding(o.center, b)) || o.rings.some((r) => inRing(b.center, r))) ??
    // OSM's short or alt name is the code itself ("Grady Gammage Memorial Auditorium", alt_name GGMA).
    (o.code && candidates.find((b) => sameCode(b, o.code))) ??
    candidates.find((b) => osmNames(b.tags).some((n) => names.has(norm(n)))) ??
    candidates.find((b) => osmNames(b.tags).some((n) => cores.has(core(n)))) ??
    wordMatch(o, variants);
  if (host) joined.get(host).push(o);
  else if (o.code) unjoined.push(o);
}
// Still unplaced: name the unnamed building its footprint or point lands on, unless it's a hall.
const hallNameKeys = new Set(halls.flatMap((h) => h.names.flatMap((n) => [norm(n), core(n)])).filter(Boolean));
const leftover = unjoined.filter((o) => {
  const plain = o.name.replace(/\s*\(.*?\)\s*/g, " ");
  if ([o.name, plain].some((n) => hallNameKeys.has(norm(n)) || hallNameKeys.has(core(n)))) return true;
  const u = unnamed.find((b) => !NOT_PLACES.has(b.tags.building) && ((o.center && inBuilding(o.center, b)) || o.rings.some((r) => inRing(b.center, r))));
  if (u) joined.get(namedFromList(u, o)).push(o);
  return !u;
});

const placeIds = new Set();
let places = [];
for (const b of candidates) {
  const base = slug(b.tags.name);
  const id = placeIds.has(base) ? `${base}-${b.osm.split("/")[1]}` : base;
  const ov = overrides.places?.[id] ?? {};
  if (ov.hide) continue;
  const offs = joined.get(b).sort((x, y) => y.area - x.area);
  if (!offs.length && !inCampus(b.center)) {
    report.offCampus.push(id);
    continue;
  }
  placeIds.add(id);
  const nameKey = norm(b.tags.name);
  const aliases = uniqBy([...osmNames(b.tags).slice(1), ...offs.flatMap((o) => [...o.aliases, o.name])], norm).filter((a) => norm(a) !== nameKey);
  const codes = ov.codes ?? uniqBy(offs.map((o) => o.code), (c) => c.toUpperCase());
  // An academic building nobody lists (no official code, no alias anywhere) is a heating plant,
  // not somewhere a schedule sends you. Dining, gyms and libraries are found by kind instead.
  const kind = ov.kind ?? kindOf(b.tags);
  if (kind === "academic" && !codes.length && !(ov.aliases ?? aliases).length) {
    report.noCodeOrAlias.push(id);
    continue;
  }
  const snap = seedsFor(b);
  if (!snap.via) {
    report.unsnapped.push(`place ${id}`);
    continue;
  }
  // OSM short_name is often the code ("OSM"); the official abbreviated name reads better.
  const osmShort = /^[A-Z0-9]{2,6}$/.test(b.tags.short_name ?? "") ? null : b.tags.short_name;
  places.push({
    out: {
      id,
      name: b.tags.name,
      short: ov.short ?? offs[0]?.aliases[0] ?? osmShort ?? b.tags.name,
      kind,
      codes,
      aliases: ov.aliases ?? aliases,
      lng: round(lngLat(b.center)[0], 6),
      lat: round(lngLat(b.center)[1], 6),
      osm: b.osm,
    },
    b,
    snap,
  });
}
const routable = places; // every place kept above is snapped onto the campus network

// ---- Routing: one multi-source Dijkstra per hall over its seeds, to every place.
function dijkstra(seeds) {
  const d = new Float64Array(nNodes).fill(Infinity);
  const pred = new Int32Array(nNodes).fill(-1);
  const root = new Map();
  const hk = [], hv = []; // binary min-heap of (distance, node), lazy deletion
  const push = (k, v) => {
    let i = hk.length;
    hk.push(k); hv.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hk[p] <= k) break;
      hk[i] = hk[p]; hv[i] = hv[p]; i = p;
    }
    hk[i] = k; hv[i] = v;
  };
  const pop = () => {
    const top = hv[0], k = hk.pop(), v = hv.pop();
    if (hk.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= hk.length) break;
        if (c + 1 < hk.length && hk[c + 1] < hk[c]) c++;
        if (hk[c] >= k) break;
        hk[i] = hk[c]; hv[i] = hv[c]; i = c;
      }
      hk[i] = k; hv[i] = v;
    }
    return top;
  };
  for (const s of seeds) {
    if (s.cost < d[s.node]) {
      d[s.node] = s.cost;
      root.set(s.node, s);
      push(s.cost, s.node);
    }
  }
  const done = new Uint8Array(nNodes);
  while (hk.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    for (let j = head[u]; j < head[u + 1]; j++) {
      const v = adj[j], nd = d[u] + adjW[j];
      if (nd < d[v]) {
        d[v] = nd;
        pred[v] = u;
        push(nd, v);
      }
    }
  }
  return { d, pred, root };
}

const routes = new Map(); // dormId -> { row: minutes per routable place, paths: { placeId: polyline } }
for (const h of halls) {
  if (!h.snap.via) continue;
  const { d, pred, root } = dijkstra(h.snap.seeds);
  const row = [];
  const paths = {};
  for (const p of routable) {
    let best = null;
    for (const s of p.snap.seeds) {
      const m = d[s.node] + s.cost;
      if (!best || m < best.m) best = { m, s };
    }
    if (!Number.isFinite(best.m)) {
      report.unreached.push(`${h.d.dorm_id} -> ${p.out.id}`);
      row.push(null);
      continue;
    }
    row.push(round(best.m / config.walkingSpeed / 60, 1));
    const nodes = [];
    for (let u = best.s.node; u !== -1; u = pred[u]) nodes.push(u);
    nodes.reverse();
    const start = root.get(nodes[0]).lead;
    const pts = [...start, ...nodes.map((u) => P[u]), ...[...best.s.lead].reverse()];
    paths[p.out.id] = encode(simplify(pts, 2).map(lngLat));
  }
  routes.set(h.d.dorm_id, { row, paths });
}

// Past 45 minutes (the check's ceiling) from a hall on campus is a farm or golf-course site, not a
// walk to class. Halls off the campus outline (UF's Infinity Hall) don't count toward this.
const MAX_MINUTES = 45;
const onCampusRoutes = halls.filter((h) => routes.has(h.d.dorm_id) && inCampus(h.at)).map((h) => routes.get(h.d.dorm_id));
const judges = onCampusRoutes.length ? onCampusRoutes : [...routes.values()];
const farIdx = new Set(routable.flatMap((p, i) => (judges.some((r) => r.row[i] > MAX_MINUTES) ? [i] : [])));
for (const i of farIdx) report.beyondWalk.push(routable[i].out.id);
const kept = routable.filter((_, i) => !farIdx.has(i));
places = kept;

const outDir = path.join("data/campus/paths", id);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
// Footprints touching or within 1.5 m (a commons built onto its hall). Those pairs may be under
// half a minute apart; minutes.attached lists them so the check can tell them from snapping bugs.
function gap(a, b) {
  let best = Infinity;
  for (const [r, s] of [[a, b], [b, a]]) {
    for (const p of r) {
      if (inRing(p, s)) return 0;
      for (let i = 1; i < s.length; i++) best = Math.min(best, project(p, s[i - 1], s[i]).d);
    }
  }
  return best;
}
const touching = (a, b) => a.rings.some((r) => b.rings.some((s) => gap(r, s) <= 1.5));
const minutes = { places: kept.map((p) => p.out.id), halls: {}, attached: {} };
for (const [dormId, { row, paths }] of routes) {
  minutes.halls[dormId] = row.filter((_, i) => !farIdx.has(i));
  const hallBuilding = halls.find((h) => h.d.dorm_id === dormId).building;
  const attached = kept.filter((p, i) => minutes.halls[dormId][i] < 0.5 && hallBuilding && touching(hallBuilding, p.b)).map((p) => p.out.id);
  if (attached.length) minutes.attached[dormId] = attached;
  for (const i of farIdx) delete paths[routable[i].out.id];
  fs.writeFileSync(path.join(outDir, `${dormId}.json`), JSON.stringify(paths));
}

// Each hall's nearest dining hall, library and gym. Public (the hall page shows them), so they
// go in the client file; the full matrix stays in minutes.json.
const NEAR_KINDS = ["dining", "library", "gym"];
function nearOf(dormId) {
  const row = minutes.halls[dormId];
  if (!row) return undefined;
  const near = {};
  kept.forEach((p, i) => {
    const k = p.out.kind;
    if (NEAR_KINDS.includes(k) && row[i] !== null && (!near[k] || row[i] < near[k].minutes)) near[k] = { placeId: p.out.id, minutes: row[i] };
  });
  return Object.keys(near).length ? near : undefined;
}

// ---- Client-safe file
const fetched = (c) => c?.fetchedAt?.slice(0, 10);
const yearUrls = [...new Set(halls.flatMap((h) => [h.year.source].flat()).filter((u) => u?.startsWith("http")))];
const sources = [
  { name: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright", license: "ODbL-1.0", use: "building names, footprints and entrances; the walking network", fetched: fetched(walk) },
  codeList && { name: config.codes.title, url: config.codes.url, use: "building codes and aliases", fetched: fetched(codeList) },
  codeFile && { name: codeFile.name, url: codeFile.url, use: "building codes", read: codeFile.read },
  config.housing && { name: config.housing.title, url: config.housing.url, use: "first-year and upper-year tags (each hall's yearSource)", note: config.housing.note },
  ...yearUrls.map((url) => ({ name: "Housing page", url, use: "year tag" })),
  Object.keys(overrides).length && { name: "Manual fixes from the dev review page", url: OVERRIDES, use: "manual pins, year tags, place codes and aliases" },
].filter(Boolean);

const pinned = halls.filter((h) => h.at);
const lngs = [...pinned.map((h) => lngLat(h.at)[0]), ...places.map((p) => p.out.lng)];
const lats = [...pinned.map((h) => lngLat(h.at)[1]), ...places.map((p) => p.out.lat)];
const campus = {
  collegeId: id,
  generatedAt: new Date().toISOString(),
  sources,
  bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)].map((v) => round(v, 5)),
  halls: halls.map((h) => ({
    dormId: h.d.dorm_id,
    name: h.d.dorm_name,
    lng: h.at ? round(lngLat(h.at)[0], 6) : null,
    lat: h.at ? round(lngLat(h.at)[1], 6) : null,
    pin: h.pin,
    osm: h.building?.osm ?? null,
    year: h.year.year,
    yearSource: h.year.source,
    near: nearOf(h.d.dorm_id),
  })),
  places: places.map((p) => p.out),
};
fs.writeFileSync(`data/campus/${id}.json`, JSON.stringify(campus, null, 1) + "\n");
fs.writeFileSync(`data/campus/${id}.minutes.json`, JSON.stringify(minutes));
// The pilot list the app reads (lib/hall-finder.ts PILOT_SCHOOLS).
const PILOTS = "data/campus/index.json";
fs.writeFileSync(PILOTS, JSON.stringify([...new Set([...read(PILOTS, []), id])].sort()) + "\n");

// ---- Report
const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(1)} KB`;
console.log(`${id}: graph ${nNodes} nodes, ${eu.length} edges`);
console.log(`halls ${halls.length}: pins`, count(halls, (h) => h.pin), "snapped via", count(halls, (h) => h.snap.via));
console.log(`places ${places.length}:`, count(places, (p) => p.out.kind), "snapped via", count(places, (p) => p.snap.via));
console.log(`official buildings ${official.length}: ${fromList.size} name unnamed OSM buildings, ${leftover.length} coded ones sit on no place`);
for (const [k, list] of Object.entries(report)) if (list.length) console.log(`${k} (${list.length}): ${list.slice(0, 40).join(", ")}${list.length > 40 ? " …" : ""}`);
console.log(`data/campus/${id}.json ${kb(`data/campus/${id}.json`)}, minutes ${kb(`data/campus/${id}.minutes.json`)}`);
