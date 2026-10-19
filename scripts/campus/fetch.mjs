// Downloads the raw inputs for one campus, once, into scripts/campus/cache/<collegeId>/
// (gitignored). build.mjs reads only the cache, so rebuilding never hits the network.
//   node scripts/campus/fetch.mjs penn-state            fetch whatever isn't cached yet
//   node scripts/campus/fetch.mjs penn-state --refresh  fetch everything again
// One request per dataset:
//   buildings.json  OSM named (or addressed) buildings in the campus area, plus their entrance=* nodes
//   walk.json       OSM walking network in the campus bbox plus walkMarginM
//   codes.json      the school's official building list, when config.codes.arcgis points at one
// OVERPASS_URL overrides the endpoint (default overpass-api.de).
import fs from "node:fs";
import path from "node:path";

const UA = "dormscape-campus-data/1.0 (+https://dormscape.us)";
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

const id = process.argv[2];
if (!id) throw new Error("usage: node scripts/campus/fetch.mjs <collegeId> [--refresh]");
const refresh = process.argv.includes("--refresh");
const config = JSON.parse(fs.readFileSync(path.join("scripts/campus/config", `${id}.json`), "utf8"));
const dir = path.join("scripts/campus/cache", id);
fs.mkdirSync(dir, { recursive: true });

// Polite fetch: one request at a time, exponential backoff on 429 and busy-server 5xx.
async function get(url, init = {}) {
  for (let attempt = 0, wait = 30; ; attempt++, wait *= 2) {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers } });
    if (res.ok) return res.json();
    if (![429, 502, 503, 504].includes(res.status) || attempt === 6) {
      throw new Error(`${url} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const retry = Number(res.headers.get("retry-after")) || wait;
    console.log(`  ${res.status}, retrying in ${retry}s`);
    await new Promise((r) => setTimeout(r, retry * 1000));
  }
}

const overpass = (query) =>
  get(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });

// Campus area: an OSM way/relation (Overpass area id = 2400000000 + way, 3600000000 + relation) or the bbox.
const [S, W, N, E] = config.area.bbox;
const [osmType, osmId] = (config.area.osm ?? "").split("/");
const areaId = osmType === "relation" ? 3600000000 + Number(osmId) : osmType === "way" ? 2400000000 + Number(osmId) : null;
const inArea = areaId ? "(area.campus)" : `(${S},${W},${N},${E})`;
const areaLine = areaId ? `area(${areaId})->.campus;` : "";

// Margin so routes that leave the campus edge (a street just outside it) still resolve.
const m = config.walkMarginM ?? 0;
const dLat = m / 111320;
const dLng = m / (111320 * Math.cos((((S + N) / 2) * Math.PI) / 180));
const walkBox = [S - dLat, W - dLng, N + dLat, E + dLng].map((v) => v.toFixed(6)).join(",");

const HIGHWAYS = "footway|path|pedestrian|steps|living_street|residential|service|unclassified|tertiary|secondary|primary";

const datasets = {
  buildings: () =>
    overpass(`[out:json][timeout:300];
${areaLine}
(
  way["building"]["name"]${inArea};
  relation["building"]["name"]${inArea};
  way["building"]["addr:housenumber"]${inArea};
)->.b;
.b out body geom;
way(r.b)->.m;
.m out skel;
(node(w.b)["entrance"]; node(w.m)["entrance"];);
out;`),

  // Sidewalks and crossings are highway=footway (footway=sidewalk|crossing), so the list covers them.
  walk: () =>
    overpass(`[out:json][timeout:300][bbox:${walkBox}];
way["highway"~"^(${HIGHWAYS})$"]["access"!~"^(private|no)$"]["foot"!="no"]->.w;
.w out body qt;
node(w.w);
out skel qt;`),

  codes: config.codes?.arcgis
    ? async () => {
        // ArcGIS caps a page at maxRecordCount; page through named features only.
        const out = [];
        for (let offset = 0; ; offset += 1000) {
          const q = new URLSearchParams({
            where: `${config.codes.fields.name} IS NOT NULL`,
            outFields: "*",
            outSR: "4326",
            resultOffset: String(offset),
            resultRecordCount: "1000",
            f: "json",
          });
          const page = await get(`${config.codes.arcgis}/query?${q}`);
          if (page.error) throw new Error(JSON.stringify(page.error));
          out.push(...page.features);
          if (!page.exceededTransferLimit) return { features: out };
        }
      }
    : null,
};

for (const [name, run] of Object.entries(datasets)) {
  const file = path.join(dir, `${name}.json`);
  if (!run) continue;
  if (fs.existsSync(file) && !refresh) {
    console.log(`${name}: cached (${file})`);
    continue;
  }
  console.log(`${name}: fetching`);
  const data = await run();
  fs.writeFileSync(file, JSON.stringify({ fetchedAt: new Date().toISOString(), ...data }));
  console.log(`${name}: ${(fs.statSync(file).size / 1e6).toFixed(1)} MB -> ${file}`);
}
