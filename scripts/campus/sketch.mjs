// Draws the static Hall Finder map card for each pilot school: real footprints, streets
// and the walking routes from the best hall for one sample week of classes. It's an SVG
// (no MapLibre, no raster) for the homepage, college page band and planner callout.
//   node scripts/campus/sketch.mjs [collegeId ...]     default: every pilot
// Reads data/campus/<id>.json, its minutes and paths, and the fetch cache (gitignored).
// Writes public/hall-finder/<id>.svg and data/campus/sketch.json (halls ranked, the sample
// week and its top three halls with their weekly minutes, so the card matches the finder).
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : read("data/campus/index.json");
const SKETCH = "data/campus/sketch.json";
const out = fs.existsSync(SKETCH) ? read(SKETCH) : {};
const INK = "#16161D";
const SANS = "Archivo, 'Arial Narrow', Arial, sans-serif";
// M W F, T Th, M W F, T Th, M W (lib/hall-finder.ts DAYS: M=1 T=2 W=4 Th=8 F=16).
const WEEK = [21, 10, 21, 10, 5];
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

for (const id of ids) {
  const campus = read(`data/campus/${id}.json`);
  const minutes = read(`data/campus/${id}.minutes.json`);
  const cache = `scripts/campus/cache/${id}`;
  if (!fs.existsSync(`${cache}/buildings.json`)) throw new Error(`no cache for ${id}; run node scripts/campus/fetch.mjs ${id}`);
  const osm = read(`${cache}/buildings.json`).elements;
  const walk = read(`${cache}/walk.json`).elements;

  const [W, S, E, N] = campus.bounds;
  const LAT0 = (S + N) / 2, LNG0 = (W + E) / 2;
  const MY = (6371008.8 * Math.PI) / 180, MX = MY * Math.cos((LAT0 * Math.PI) / 180);
  const xy = ([lng, lat]) => [(lng - LNG0) * MX, (LAT0 - lat) * MY];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // The sample week: the config's "sketch" place ids, or five academic buildings with short
  // names, starting nearest the middle of them all, at least 110 m apart so routes fan out.
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
  const paths = read(`data/campus/paths/${id}/${best.dormId}.json`);
  const routes = picked.map((p) => (paths[p.id] ? decode(paths[p.id]).map(xy) : []));

  // Frame: the best hall and the five places fill the middle half of a 1000-unit square, so
  // any crop from 4:3 to 7:8 (object-fit: cover) still shows them.
  const focus = [xy([best.lng, best.lat]), ...picked.map((p) => p.at)];
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

  // Streets from the walking network, widest first.
  const nodes = new Map(walk.filter((e) => e.type === "node").map((e) => [e.id, v(xy([e.lon, e.lat]))]));
  // Drawn widths in metres (wider than life so they read at card size).
  const WIDTH = { primary: 30, secondary: 30, tertiary: 26, residential: 22, unclassified: 22, living_street: 18, service: 12, pedestrian: 9, footway: 5, path: 5, steps: 5 };
  const streets = {};
  for (const e of walk) {
    const w = e.type === "way" && WIDTH[e.tags?.highway] && Math.max(1.5, Math.round(WIDTH[e.tags.highway] * k * 2) / 2);
    if (!w) continue;
    const pts = e.nodes.map((n) => nodes.get(n)).filter(Boolean);
    if (pts.length > 1 && inView(pts)) (streets[w] ??= []).push(d(pts));
  }

  // Footprints: places on the sample week white, halls shaded by rank, the best one yellow.
  const rankOf = new Map(ranked.map((h, i) => [h.dormId, i]));
  const hallByOsm = new Map(campus.halls.filter((h) => h.osm).map((h) => [h.osm, h.dormId]));
  const pickedOsm = new Set(picked.map((p) => p.osm));
  const plain = [], halls = [], places = [];
  for (const e of osm) {
    if (!e.tags?.building) continue;
    const rings = (e.type === "way" ? [e.geometry] : (e.members ?? []).filter((m) => m.role !== "inner").map((m) => m.geometry))
      .filter((g) => g?.length > 2)
      .map((g) => g.map((p) => v(xy([p.lon, p.lat]))));
    if (!rings.length || !rings.some(inView)) continue;
    const path = rings.map((r) => d(r, true)).join("");
    const key = `${e.type}/${e.id}`;
    const dormId = hallByOsm.get(key);
    if (pickedOsm.has(key)) places.push(path);
    else if (dormId === best.dormId) halls.unshift(`<path d="${path}" fill="#FFD83D" stroke="${INK}" stroke-width="3"/>`);
    else if (dormId && rankOf.has(dormId)) halls.push(`<path d="${path}" fill="${shade(rankOf.get(dormId) / Math.max(ranked.length - 1, 1))}" stroke="${INK}" stroke-width="1.5"/>`);
    else plain.push(path);
  }

  // Labels skip (minute pills) or flip left (place names) rather than overlap one another.
  const boxes = [];
  const free = (x, y, w, h) => boxes.every((b) => x + w < b[0] || b[0] + b[2] < x || y + h < b[1] || b[1] + b[3] < y);
  const pill = (x, y, text, size = 15) => {
    const w = textWidth(text, size) + 16, h = size + 12;
    boxes.push([x - w / 2, y - h / 2, w, h]);
    return `<rect x="${Math.round(x - w / 2)}" y="${Math.round(y - h / 2)}" width="${Math.round(w)}" height="${h}" rx="${h / 2}" fill="${INK}"/>` +
      `<text x="${Math.round(x)}" y="${Math.round(y + size * 0.36)}" font-size="${size}" fill="#FFD83D" text-anchor="middle">${esc(text)}</text>`;
  };
  const labels = [];
  const [bx, by] = v(xy([best.lng, best.lat]));
  labels.push(pill(bx, by - 34, `1 · ${best.name}`));
  for (const p of picked) {
    const [x, y] = v(p.at);
    boxes.push([x - 14, y - 14, 28, 28]);
  }
  picked.forEach((p, i) => {
    const [x, y] = v(p.at);
    const name = p.short ?? p.name;
    const w = textWidth(name, 15) + 14;
    const left = !free(x + 18, y - 13, w, 26) && free(x - 18 - w, y - 13, w, 26);
    const lx = left ? x - 18 - w : x + 18;
    boxes.push([lx, y - 13, w, 26]);
    labels.push(
      `<rect x="${Math.round(lx)}" y="${Math.round(y - 13)}" width="${Math.round(w)}" height="26" rx="5" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
      `<text x="${Math.round(lx + 7)}" y="${Math.round(y + 5)}" font-size="15" fill="${INK}">${esc(name)}</text>` +
      `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="14" fill="${INK}"/>` +
      `<text x="${Math.round(x)}" y="${Math.round(y + 5.5)}" font-size="15" fill="#fff" text-anchor="middle">${i + 1}</text>`,
    );
  });
  routes.forEach((r, i) => {
    const m = ranked[0].row[i];
    if (r.length < 2 || m < 3) return;
    const [x, y] = v(r[Math.floor(r.length * 0.6)]);
    const text = `${Math.round(m)} min`;
    const w = textWidth(text, 15) + 16;
    if (free(x - w / 2, y - 13.5, w, 27)) labels.push(pill(x, y, text));
  });

  const route = (color, width) => routes.filter((r) => r.length > 1).map((r) => `<path d="${d(r.map(v))}" stroke="${color}" stroke-width="${width}"/>`).join("");
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" font-family="${SANS}" font-weight="700">`,
    `<rect width="1000" height="1000" fill="#EDEBE3"/>`,
    `<g fill="none" stroke="#FBFAF7" stroke-linecap="round" stroke-linejoin="round">`,
    ...Object.entries(streets).sort((a, b) => b[0] - a[0]).map(([w, list]) => `<path stroke-width="${w}" d="${list.join("")}"/>`),
    `</g>`,
    `<path fill="#E4E1D8" d="${plain.join("")}"/>`,
    `<path fill="#fff" stroke="${INK}" stroke-width="2.5" d="${places.join("")}"/>`,
    ...halls.reverse(),
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${route("#fff", 13)}${route("#2449FF", 6)}</g>`,
    ...labels,
    `</svg>`,
  ].join("\n");
  fs.mkdirSync("public/hall-finder", { recursive: true });
  fs.writeFileSync(`public/hall-finder/${id}.svg`, `${svg}\n`);

  out[id] = {
    halls: ranked.length,
    places: picked.map((p, i) => ({ placeId: p.id, days: WEEK[i] })),
    top: ranked.slice(0, 3).map((h) => ({ dormId: h.dormId, name: hallOf.get(h.dormId)?.name ?? h.dormId, weekly: h.weekly })),
  };
  console.log(`${id}: k ${k.toFixed(2)}, ${(fs.statSync(`public/hall-finder/${id}.svg`).size / 1024).toFixed(1)} KB, best ${best.name}, ${picked.map((p) => p.short ?? p.name).join(", ")}`);
}

fs.writeFileSync(SKETCH, `${JSON.stringify(Object.fromEntries(Object.entries(out).sort()), null, 2)}\n`);
