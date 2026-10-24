// Draws Hall Finder's static maps from the campus data: real footprints, streets and walking
// routes, as SVG (no MapLibre, no raster).
//   node scripts/campus/sketch.mjs [collegeId ...]     default: every pilot
// Reads data/campus/<id>.json, its minutes and paths, and the fetch cache (gitignored).
// Writes, per school:
//   public/hall-finder/<id>.svg            the card for the homepage, college band and planner:
//                                          routes from the best hall for one sample week
//   public/hall-finder/<id>/<dormId>.svg   each hall page's "Walk times from your door" map:
//                                          routes to its nearest dining hall, library and gym
//   data/campus/sketch.json                halls ranked, the sample week and its top three halls
//                                          with their weekly minutes, so the card matches the finder
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : read("data/campus/index.json");
const SKETCH = "data/campus/sketch.json";
const out = fs.existsSync(SKETCH) ? read(SKETCH) : {};
const INK = "#16161D";
const SANS = "Archivo, 'Arial Narrow', Arial, sans-serif";
// M W F, T Th, M W F, T Th, M W (lib/hall-finder.ts DAYS: M=1 T=2 W=4 Th=8 F=16).
const WEEK = [21, 10, 21, 10, 5];
// The hall page lists these in this order (components/hall-finder/WalkTimes.tsx).
const NEAR = ["dining", "library", "gym"];
const fail = (msg) => { throw new Error(msg); };
const dayCount = (d) => [1, 2, 4, 8, 16].filter((b) => d & b).length;

function decode(str) {
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  const next = () => {
    let shift = 0, result = 0, b;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    pts.push([lng / 1e5, lat / 1e5]);
  }
  return pts;
}

// Blue (best) to pale (worst), as on the finder map (components/hall-finder/FinderMap.tsx).
function shade(t) {
  const stops = [[0, [0x24, 0x49, 0xff]], [0.5, [0x8f, 0xa4, 0xff]], [1, [0xe3, 0xe8, 0xff]]];
  const i = t <= 0.5 ? 0 : 1;
  const [t0, a] = stops[i];
  const [t1, b] = stops[i + 1];
  const k = (t - t0) / (t1 - t0);
  return `#${a.map((v, j) => Math.round(v + (b[j] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Archivo is narrow; ~0.56 em a character is a safe box width at these sizes.
const textWidth = (s, size) => s.length * size * 0.56;
const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(1)} KB`;

for (const id of ids) {
  const campus = read(`data/campus/${id}.json`);
  const minutes = read(`data/campus/${id}.minutes.json`);
  const cache = `scripts/campus/cache/${id}`;
  if (!fs.existsSync(`${cache}/buildings.json`)) throw new Error(`no cache for ${id}; run node scripts/campus/fetch.mjs ${id}`);

  const [W, S, E, N] = campus.bounds;
  const LAT0 = (S + N) / 2, LNG0 = (W + E) / 2;
  const MY = (6371008.8 * Math.PI) / 180, MX = MY * Math.cos((LAT0 * Math.PI) / 180);
  const xy = ([lng, lat]) => [(lng - LNG0) * MX, (LAT0 - lat) * MY];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // The map layers, projected to metres once: building footprints and walkable streets.
  const buildings = read(`${cache}/buildings.json`).elements
    .filter((e) => e.tags?.building)
    .map((e) => ({
      key: `${e.type}/${e.id}`,
      rings: (e.type === "way" ? [e.geometry] : (e.members ?? []).filter((m) => m.role !== "inner").map((m) => m.geometry))
        .filter((g) => g?.length > 2)
        .map((g) => g.map((p) => xy([p.lon, p.lat]))),
    }))
    .filter((b) => b.rings.length);
  const walk = read(`${cache}/walk.json`).elements;
  const nodeAt = new Map(walk.filter((e) => e.type === "node").map((e) => [e.id, xy([e.lon, e.lat])]));
  // Drawn widths in metres (wider than life so they read at card size).
  const WIDTH = { primary: 30, secondary: 30, tertiary: 26, residential: 22, unclassified: 22, living_street: 18, service: 12, pedestrian: 9, footway: 5, path: 5, steps: 5 };
  const streets = walk
    .filter((e) => e.type === "way" && WIDTH[e.tags?.highway])
    .map((e) => ({ m: WIDTH[e.tags.highway], pts: e.nodes.map((n) => nodeAt.get(n)).filter(Boolean) }))
    .filter((s) => s.pts.length > 1);
  const hallByOsm = new Map(campus.halls.filter((h) => h.osm).map((h) => [h.osm, h.dormId]));

  /**
   * One map: the hall and its stops framed into the middle half of a 1000-unit square (so any
   * crop from 4:3 to 7:8 still shows them), the hall in yellow with its pill, the numbered
   * stops with their routes and minutes. `hallFill` colours the other halls (null: cream).
   */
  function draw({ hall, hallLabel, stops, hallFill, lean = false, size = 15 }) {
    const focus = [xy([hall.lng, hall.lat]), ...stops.map((s) => s.at)];
    const fx = focus.map((p) => p[0]), fy = focus.map((p) => p[1]);
    const span = Math.max(Math.max(...fx) - Math.min(...fx), Math.max(...fy) - Math.min(...fy), 1);
    const k = Math.min(500 / span, 1.6);
    const cx = (Math.max(...fx) + Math.min(...fx)) / 2, cy = (Math.max(...fy) + Math.min(...fy)) / 2;
    const v = ([x, y]) => [500 + (x - cx) * k, 500 + (y - cy) * k];
    const inView = (pts) => pts.some(([x, y]) => x > -60 && x < 1060 && y > -60 && y < 1060);
    // Whole units, dropping points within 2.5 units of the last kept one (keeps files small).
    const d = (pts, close) => {
      const r = pts.filter((p, i) => i === 0 || i === pts.length - 1 || dist(p, pts[i - 1]) >= 2.5).map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`);
      return `M${r.join("L")}${close ? "Z" : ""}`;
    };

    // Zoomed out (a hall page whose gym is across campus), footpaths and sheds can't be seen at
    // card size and would triple the file, so `lean` maps leave them out.
    const lines = {};
    for (const s of streets) {
      if (lean && k < 1 && s.m <= 5) continue;
      const pts = s.pts.map(v);
      if (inView(pts)) (lines[Math.max(1.5, Math.round(s.m * k * 2) / 2)] ??= []).push(d(pts));
    }

    const stopOsm = new Set(stops.map((s) => s.osm));
    const plain = [], halls = [], places = [];
    for (const b of buildings) {
      const rings = b.rings.map((r) => r.map(v));
      if (!rings.some(inView)) continue;
      if (lean && !stopOsm.has(b.key) && hallByOsm.get(b.key) !== hall.dormId && rings.every((r) => {
        const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
        return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) < 120;
      })) continue;
      const path = rings.map((r) => d(r, true)).join("");
      const dormId = hallByOsm.get(b.key);
      const fill = dormId && hallFill ? hallFill(dormId) : null;
      if (stopOsm.has(b.key)) places.push(path);
      else if (dormId === hall.dormId) halls.unshift(`<path d="${path}" fill="#FFD83D" stroke="${INK}" stroke-width="3"/>`);
      else if (fill) halls.push(`<path d="${path}" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>`);
      else if (dormId && !hallFill) halls.push(`<path d="${path}" fill="#F8F4EA" stroke="${INK}" stroke-opacity=".35" stroke-width="1.5"/>`);
      else plain.push(path);
    }

    // Labels skip (minute pills) or flip left (place names) rather than overlap one another.
    const boxes = [];
    const free = (x, y, w, h) => boxes.every((b) => x + w < b[0] || b[0] + b[2] < x || y + h < b[1] || b[1] + b[3] < y);
    const pill = (x, y, text) => {
      const w = textWidth(text, size) + 16, h = size + 12;
      boxes.push([x - w / 2, y - h / 2, w, h]);
      return `<rect x="${Math.round(x - w / 2)}" y="${Math.round(y - h / 2)}" width="${Math.round(w)}" height="${h}" rx="${h / 2}" fill="${INK}"/>` +
        `<text x="${Math.round(x)}" y="${Math.round(y + size * 0.36)}" font-size="${size}" fill="#FFD83D" text-anchor="middle">${esc(text)}</text>`;
    };
    const labels = [];
    const [bx, by] = v(xy([hall.lng, hall.lat]));
    labels.push(pill(bx, by - 34 * (size / 15), hallLabel));
    for (const s of stops) {
      const [x, y] = v(s.at);
      boxes.push([x - 14, y - 14, 28, 28]);
    }
    // Label geometry scales with the type size (15 on the cards, larger on hall pages).
    const u = size / 15;
    stops.forEach((s, i) => {
      const [x, y] = v(s.at);
      const w = textWidth(s.label, size) + 14 * u, h = 26 * u, r = 14 * u;
      const left = !free(x + r + 4, y - h / 2, w, h) && free(x - r - 4 - w, y - h / 2, w, h);
      const lx = left ? x - r - 4 - w : x + r + 4;
      boxes.push([lx, y - h / 2, w, h]);
      labels.push(
        `<rect x="${Math.round(lx)}" y="${Math.round(y - h / 2)}" width="${Math.round(w)}" height="${Math.round(h)}" rx="${Math.round(5 * u)}" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
        `<text x="${Math.round(lx + 7 * u)}" y="${Math.round(y + 5 * u)}" font-size="${size}" fill="${INK}">${esc(s.label)}</text>` +
        `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${Math.round(r)}" fill="${INK}"/>` +
        `<text x="${Math.round(x)}" y="${Math.round(y + 5.5 * u)}" font-size="${size}" fill="#fff" text-anchor="middle">${i + 1}</text>`,
      );
    });
    for (const s of stops) {
      if (s.route.length < 2 || s.minutes < 3) continue;
      const [x, y] = v(s.route[Math.floor(s.route.length * 0.6)]);
      const text = `${Math.round(s.minutes)} min`;
      const w = textWidth(text, size) + 16 * u;
      if (free(x - w / 2, y - 13.5 * u, w, 27 * u)) labels.push(pill(x, y, text));
    }

    const route = (color, width) => stops.filter((s) => s.route.length > 1).map((s) => `<path d="${d(s.route.map(v))}" stroke="${color}" stroke-width="${width}"/>`).join("");
    return { k, svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" font-family="${SANS}" font-weight="700">`,
      `<rect width="1000" height="1000" fill="#EDEBE3"/>`,
      `<g fill="none" stroke="#FBFAF7" stroke-linecap="round" stroke-linejoin="round">`,
      ...Object.entries(lines).sort((a, b) => b[0] - a[0]).map(([w, list]) => `<path stroke-width="${w}" d="${list.join("")}"/>`),
      `</g>`,
      `<path fill="#E4E1D8" d="${plain.join("")}"/>`,
      `<path fill="#fff" stroke="${INK}" stroke-width="2.5" d="${places.join("")}"/>`,
      ...halls.reverse(),
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${route("#fff", 13)}${route("#2449FF", 6)}</g>`,
      ...labels,
      `</svg>`,
    ].join("\n") + "\n" };
  }

  // ---- The school's card: the best hall for a sample week. The config's "sketch" place ids,
  // or five academic buildings with short names, starting nearest the middle of them all, at
  // least 110 m apart so routes fan out.
  const col = new Map(minutes.places.map((p, i) => [p, i]));
  const academic = campus.places
    .filter((p) => p.kind === "academic" && col.has(p.id) && (p.short ?? p.name).length <= 20)
    .map((p) => ({ ...p, at: xy([p.lng, p.lat]) }));
  const chosen = read(`scripts/campus/config/${id}.json`).sketch;
  const median = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const mid = [median(academic.map((p) => p.at[0])), median(academic.map((p) => p.at[1]))];
  const picked = chosen ? chosen.map((pid) => academic.find((p) => p.id === pid) ?? fail(`${id}: sketch place ${pid}`)) : [];
  for (const p of chosen ? [] : [...academic].sort((a, b) => dist(a.at, mid) - dist(b.at, mid))) {
    if (picked.length === WEEK.length) break;
    if (picked.every((q) => dist(p.at, q.at) >= 110)) picked.push(p);
  }
  const ranked = Object.entries(minutes.halls)
    .map(([dormId, row]) => ({ dormId, row: picked.map((p) => row[col.get(p.id)]) }))
    .filter((h) => h.row.every(Number.isFinite))
    .map((h) => ({ ...h, weekly: Math.round(picked.reduce((s, _, i) => s + dayCount(WEEK[i]) * h.row[i] * 2, 0) * 10) / 10 }))
    .sort((a, b) => a.weekly - b.weekly || a.dormId.localeCompare(b.dormId));
  const hallOf = new Map(campus.halls.map((h) => [h.dormId, h]));
  const best = hallOf.get(ranked[0].dormId);
  const bestPaths = read(`data/campus/paths/${id}/${best.dormId}.json`);
  const rankOf = new Map(ranked.map((h, i) => [h.dormId, i]));
  const card = draw({
    hall: best,
    hallLabel: `1 · ${best.name}`,
    stops: picked.map((p, i) => ({ at: p.at, osm: p.osm, label: p.short ?? p.name, minutes: ranked[0].row[i], route: bestPaths[p.id] ? decode(bestPaths[p.id]).map(xy) : [] })),
    hallFill: (dormId) => (rankOf.has(dormId) ? shade(rankOf.get(dormId) / Math.max(ranked.length - 1, 1)) : null),
  });
  fs.mkdirSync("public/hall-finder", { recursive: true });
  fs.writeFileSync(`public/hall-finder/${id}.svg`, card.svg);
  out[id] = {
    halls: ranked.length,
    places: picked.map((p, i) => ({ placeId: p.id, days: WEEK[i] })),
    top: ranked.slice(0, 3).map((h) => ({ dormId: h.dormId, name: hallOf.get(h.dormId)?.name ?? h.dormId, weekly: h.weekly })),
  };
  console.log(`${id}: card k ${card.k.toFixed(2)}, ${kb(`public/hall-finder/${id}.svg`)}, best ${best.name}, ${picked.map((p) => p.short ?? p.name).join(", ")}`);

  // ---- Each hall page's map: routes to its nearest dining hall, library and gym.
  const placeOf = new Map(campus.places.map((p) => [p.id, p]));
  const dir = `public/hall-finder/${id}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let total = 0, count = 0;
  for (const hall of campus.halls) {
    if (!hall.near || hall.lng === null) continue;
    const paths = read(`data/campus/paths/${id}/${hall.dormId}.json`);
    const stops = NEAR.filter((k) => hall.near[k]).map((k) => {
      const p = placeOf.get(hall.near[k].placeId);
      // The full name when it fits: a short name can read as a residence hall ("Redifer Hall").
      return { at: xy([p.lng, p.lat]), osm: p.osm, label: p.name.length <= 24 ? p.name : (p.short ?? p.name), minutes: hall.near[k].minutes, route: paths[p.id] ? decode(paths[p.id]).map(xy) : [] };
    });
    const map = draw({ hall, hallLabel: hall.name, stops, hallFill: null, lean: true, size: 22 });
    fs.writeFileSync(`${dir}/${hall.dormId}.svg`, map.svg);
    total += map.svg.length;
    count++;
  }
  console.log(`${id}: ${count} hall maps, ${(total / 1024 / Math.max(count, 1)).toFixed(1)} KB each on average`);
}

fs.writeFileSync(SKETCH, `${JSON.stringify(Object.fromEntries(Object.entries(out).sort()), null, 2)}\n`);
