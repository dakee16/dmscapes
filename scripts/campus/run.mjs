// One wave of Hall Finder schools, start to finish, then a report to review before merging.
//   node scripts/campus/run.mjs ohio-state unc umd          fetch (what isn't cached), build, draw, check
//   node scripts/campus/run.mjs --refresh ohio-state        fetch everything again first
//   node scripts/campus/run.mjs --report ohio-state unc     report on the data as it is, no rebuild
// Per school it runs fetch.mjs, build.mjs and check-campus.mjs; then sketch.mjs for the wave (the
// maps come out slimmed) and svg-slim.mjs --check. A school with no config is skipped with the
// command that starts one (area.mjs --write). Adding a school to data/campus/index.json makes it
// public once merged (Hall Finder is live), so every ✗ in the report is fixed or explained first.
// Several runs can go at once (one per person or agent): fetching is parallel, but building,
// drawing and the shared lists (index.json, built.json, sketch.json) take a lock, and after each
// run index.json and built.json are rewritten from the campus files themselves.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const refresh = args.includes("--refresh");
const ids = args.filter((a) => !a.startsWith("--"));
if (!ids.length) throw new Error("usage: node scripts/campus/run.mjs [--refresh | --report] <collegeId> …");

const node = (script, ...rest) => spawnSync(process.execPath, [script, ...rest], { encoding: "utf8" });
const read = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const kb = (p) => (fs.existsSync(p) ? fs.statSync(p).size / 1024 : 0);
const dirMb = (d) => (fs.existsSync(d) ? fs.readdirSync(d).reduce((n, f) => n + fs.statSync(path.join(d, f)).size, 0) / 1e6 : 0);
const say = (s) => process.stdout.write(`${s}\n`);

// A directory lock (mkdir is atomic) around anything that writes the shared lists.
const LOCK = "scripts/campus/cache/.lock";
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function locked(fn) {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  for (let waited = 0; ; waited += 2000) {
    try {
      fs.mkdirSync(LOCK);
      break;
    } catch {
      // A lock older than 20 minutes is from a run that died.
      if (Date.now() - fs.statSync(LOCK, { throwIfNoEntry: false })?.mtimeMs > 20 * 60 * 1000) fs.rmSync(LOCK, { recursive: true, force: true });
      if (waited % 60000 === 0) say(`  waiting for another run's lock…`);
      sleep(2000);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { recursive: true, force: true });
  }
}
// The pilot list and build dates, from what is actually built (minutes files are the record).
function reindex() {
  const built = fs.readdirSync("data/campus").filter((f) => f.endsWith(".minutes.json")).map((f) => f.slice(0, -".minutes.json".length)).sort();
  fs.writeFileSync("data/campus/index.json", `${JSON.stringify(built)}\n`);
  const dates = Object.fromEntries(built.map((id) => [id, read(`data/campus/${id}.json`).generatedAt]));
  fs.writeFileSync("data/campus/built.json", `${JSON.stringify(dates, null, 2)}\n`);
}

const ready = [];
for (const id of ids) {
  if (!read(`data/schools/${id}.json`)) {
    say(`✗ ${id}: no data/schools/${id}.json`);
    continue;
  }
  if (!read(`scripts/campus/config/${id}.json`)) {
    say(`✗ ${id}: no config yet. Start one with: node scripts/campus/area.mjs ${id} --write`);
    continue;
  }
  if (!reportOnly) {
    say(`… ${id}: fetch`);
    const f = node("scripts/campus/fetch.mjs", id, ...(refresh ? ["--refresh"] : []));
    if (f.status) {
      say(`✗ ${id}: fetch failed\n${(f.stderr || f.stdout).trim().split("\n").slice(-5).join("\n")}`);
      continue;
    }
    say(`… ${id}: build`);
    const b = locked(() => node("scripts/campus/build.mjs", id));
    if (b.status) {
      say(`✗ ${id}: build failed\n${(b.stderr || b.stdout).trim().split("\n").slice(-5).join("\n")}`);
      continue;
    }
    // The build's own review notes (unpinned halls, name-only places, word matches…).
    const notes = b.stdout.split("\n").filter((l) => /^(ambiguous|unpinned|unsnapped|offCampus|noCodeOrAlias|nameOnly|beyondWalk|wordMatched|unreached) \(/.test(l));
    if (notes.length) say(notes.map((l) => `    ${l.slice(0, 220)}`).join("\n"));
  }
  if (!read(`data/campus/${id}.json`)) {
    say(`✗ ${id}: not built yet`);
    continue;
  }
  ready.push(id);
}

if (ready.length && !reportOnly) {
  say(`… maps: ${ready.join(", ")}`);
  const s = locked(() => node("scripts/campus/sketch.mjs", ...ready));
  if (s.status) say(`✗ sketch failed\n${(s.stderr || s.stdout).trim().split("\n").slice(-5).join("\n")}`);
}

if (!reportOnly) locked(reindex);

// ---- The report: one row per school, then the checks that failed.
const rows = [];
const failures = [];
for (const id of ready) {
  const school = read(`data/schools/${id}.json`);
  const config = read(`scripts/campus/config/${id}.json`);
  const campus = read(`data/campus/${id}.json`);
  const overrides = read(`data/campus/overrides/${id}.json`) ?? {};
  const excluded = Object.keys(config.excludeHalls ?? {}).length;
  const pinned = campus.halls.filter((h) => h.lng !== null && h.lat !== null).length;
  const kinds = campus.places.reduce((m, p) => ({ ...m, [p.kind]: (m[p.kind] ?? 0) + 1 }), {});
  const academic = campus.places.filter((p) => p.kind === "academic");
  const coded = academic.filter((p) => p.codes.length).length;
  const codeList = campus.sources.some((s) => /^building codes/.test(s.use ?? ""));
  const years = campus.halls.filter((h) => h.year !== null).length;
  const check = node("scripts/check-campus.mjs", id);
  const failed = check.stdout.split("\n").filter((l) => l.trim().startsWith("✗") && !l.includes("index.json") && !l.includes("built.json"));
  if (failed.length) failures.push([id, failed.map((l) => l.trim())]);
  rows.push({
    id,
    halls: `${pinned}/${school.dorms.length - excluded}${excluded ? ` (+${excluded} off-map)` : ""}`,
    places: `${academic.length} classes · ${kinds.dining ?? 0} dining · ${kinds.library ?? 0} library · ${kinds.gym ?? 0} gym`,
    codes: codeList ? `${Math.round((coded / Math.max(academic.length, 1)) * 100)}% coded` : "names only",
    years: years ? `${years} tagged` : "none",
    fixes: `${Object.keys(overrides.halls ?? {}).length} pins · ${(overrides.detours ?? []).length} detours · ${Object.keys(overrides.longWalks ?? {}).length} long`,
    size: `${kb(`data/campus/${id}.json`).toFixed(0)} KB · ${kb(`data/campus/${id}.minutes.json`).toFixed(0)} KB · paths ${dirMb(`data/campus/paths/${id}`).toFixed(1)} MB · maps ${dirMb(`public/hall-finder/${id}`).toFixed(1)} MB`,
    checks: failed.length ? `✗ ${failed.length}` : "✓",
  });
}

if (rows.length) {
  const cols = ["id", "halls", "places", "codes", "years", "fixes", "size", "checks"];
  const width = Object.fromEntries(cols.map((c) => [c, Math.max(c.length, ...rows.map((r) => String(r[c]).length))]));
  say("");
  say(cols.map((c) => c.padEnd(width[c])).join("  "));
  for (const r of rows) say(cols.map((c) => String(r[c]).padEnd(width[c])).join("  "));
}
for (const [id, list] of failures) say(`\n${id}:\n${list.map((l) => `  ${l}`).join("\n")}`);

const slim = node("scripts/campus/svg-slim.mjs", "--check");
say(`\n${slim.stdout.trim()}`);
const index = read("data/campus/index.json") ?? [];
say(`${index.length} schools in data/campus/index.json${ready.some((id) => !index.includes(id)) ? " (not all of this wave yet)" : ""}`);
process.exit(failures.length || slim.status ? 1 : 0);
