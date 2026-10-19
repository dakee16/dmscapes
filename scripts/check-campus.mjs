// Checks the Hall Finder campus data written by scripts/campus/build.mjs.
//   node scripts/check-campus.mjs              every campus in data/campus/
//   node scripts/check-campus.mjs penn-state
// Fails (exit 1) unless: every hall has a pin, every academic place has a code or alias,
// every minute is finite and 0.5–45, walking ÷ door-to-door straight line is 1.0–2.5, every hall has a
// path to every place (and each decoded path is as long as its minutes say), and the
// client file is under 150 KB and the minutes file under 250 KB.
import fs from "node:fs";

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync("data/campus").filter((f) => /^[a-z0-9-]+\.json$/.test(f)).map((f) => f.slice(0, -5));

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
function haversine([lng1, lat1], [lng2, lat2]) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
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
const length = (pts) => pts.slice(1).reduce((s, p, i) => s + haversine(pts[i], p), 0);

let failed = false;
for (const id of ids) {
  const school = JSON.parse(fs.readFileSync(`data/schools/${id}.json`, "utf8"));
  const speed = JSON.parse(fs.readFileSync(`scripts/campus/config/${id}.json`, "utf8")).walkingSpeed;
  const campus = JSON.parse(fs.readFileSync(`data/campus/${id}.json`, "utf8"));
  const minutes = JSON.parse(fs.readFileSync(`data/campus/${id}.minutes.json`, "utf8"));
  const hallById = new Map(campus.halls.map((h) => [h.dormId, h]));
  const placeById = new Map(campus.places.map((p) => [p.id, p]));
  const pinned = (h) => Number.isFinite(h?.lng) && Number.isFinite(h?.lat);
  const issues = {
    "every hall has a pin": school.dorms.filter((d) => !pinned(hallById.get(d.dorm_id))).map((d) => d.dorm_id),
    "every academic place has a code or alias": campus.places.filter((p) => p.kind === "academic" && !p.codes.length && !p.aliases.length).map((p) => p.id),
    "minutes are finite and 0.5–45": [],
    "walking ÷ straight-line is 1.0–2.5": [],
    "every hall has a path to every place": [],
    "size budgets (client < 150 KB, minutes < 250 KB)": [],
  };
  for (const d of school.dorms) {
    const hall = hallById.get(d.dorm_id);
    const row = minutes.halls[d.dorm_id];
    const file = `data/campus/paths/${id}/${d.dorm_id}.json`;
    if (!row || !fs.existsSync(file)) {
      issues["every hall has a path to every place"].push(`${d.dorm_id}: no minutes row or path file`);
      continue;
    }
    const paths = JSON.parse(fs.readFileSync(file, "utf8"));
    minutes.places.forEach((pid, i) => {
      const min = row[i];
      const place = placeById.get(pid);
      const pair = `${d.dorm_id} -> ${pid}`;
      if (!Number.isFinite(min) || min < 0.5 || min > 45) issues["minutes are finite and 0.5–45"].push(`${pair} ${min}`);
      if (!Number.isFinite(min) || !place) return;
      if (!paths[pid]) return issues["every hall has a path to every place"].push(`${pair}: missing`);
      const walked = min * 60 * speed;
      const pts = decode(paths[pid]);
      // Steps cost 1.5x, simplification trims a little, minutes round to 0.1 (8 m).
      const len = length(pts);
      if (len > walked + 10 || len < walked / 1.5 - 10) issues["every hall has a path to every place"].push(`${pair}: path ${Math.round(len)} m vs ${Math.round(walked)} m walked`);
      // Door to door (the path's ends), since big buildings' centroids sit far from their doors.
      // Under 100 m apart, one corner turned doubles the ratio, so those pairs aren't judged.
      const straight = haversine(pts[0], pts.at(-1));
      const ratio = walked / straight;
      if (straight >= 100 && !(ratio >= 1 && ratio <= 2.5)) issues["walking ÷ straight-line is 1.0–2.5"].push(`${pair} ${ratio.toFixed(2)} (${Math.round(walked)} m / ${Math.round(straight)} m)`);
    });
  }
  const kb = (f) => fs.statSync(f).size / 1024;
  if (kb(`data/campus/${id}.json`) >= 150) issues["size budgets (client < 150 KB, minutes < 250 KB)"].push(`client ${kb(`data/campus/${id}.json`).toFixed(1)} KB`);
  if (kb(`data/campus/${id}.minutes.json`) >= 250) issues["size budgets (client < 150 KB, minutes < 250 KB)"].push(`minutes ${kb(`data/campus/${id}.minutes.json`).toFixed(1)} KB`);

  console.log(`\n${id}: ${campus.halls.length} halls, ${campus.places.length} places`);
  for (const [check, list] of Object.entries(issues)) {
    console.log(`  ${list.length ? "✗" : "✓"} ${check}${list.length ? ` (${list.length})` : ""}`);
    for (const item of list.slice(0, 25)) console.log(`      ${item}`);
    if (list.length > 25) console.log(`      … ${list.length - 25} more`);
    failed ||= list.length > 0;
  }
}
process.exit(failed ? 1 : 0);
