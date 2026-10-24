// Hall Finder schedule uploads (phase 1b) against the synthetic fixtures in
// scripts/fixtures/schedules/ (rendered from fake HTML by render.sh; no real schedules).
//   node scripts/check-hall-finder-schedules.mjs
//   HF_URL=http://localhost:3100 node scripts/check-hall-finder-schedules.mjs   also the route
// Always: file sniffing, the PDF page cap, the matcher on each fixture's classes, and the
// per-user rate limit (in process). With ANTHROPIC_API_KEY set it also reads every fixture
// with the model (a fraction of a cent each) and matches what came back. With HF_URL it
// posts to a running dev server (dev auth header): oversized, fake extension and the sixth
// upload in an hour must be refused cleanly.
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { matchBuilding } from "../lib/ics.ts";
import { MAX_BYTES, MAX_PAGES, sniff } from "../lib/schedule-file.ts";
import { DEFAULT_MODEL, pdfPages, readSchedule } from "../lib/schedule-read.ts";
import { rateLimit } from "../lib/rate-limit.ts";

const DIR = "scripts/fixtures/schedules";
const M = 1, T = 2, W = 4, R = 8, F = 16;
const GRID = [
  ["ECON 102", M | W | F, "willard-building", "WILLARD 062"],
  ["MATH 140", T | R, "joab-l-thomas-building", "Thomas 102"],
  ["PSYCH 100", M | W | F, "forum-building", "FORUM 111"],
  ["CHEM 110", T | R, "osmond-laboratory", "OSM 117"],
  ["ENGL 015", M | W, "boucke-building", "BOUCKE 304"],
];
// file -> [campus, kind, [course, days, building (null: nothing matches, so it asks), location shown]]
const CASES = {
  "psu-grid.png": ["penn-state", "png", GRID],
  "psu-list.png": ["penn-state", "png", [
    ["STAT 200", M | W | F, "joab-l-thomas-building", "Thomas Bldg 102"],
    ["EARTH 002", T | R, "earth-and-engineering-sciences-building", "EES 114"],
    ["BBH 101", M | W, "biobehavioral-health-building", "BBH 101"],
    ["KINES 141", T, "walker-building", "Walker 111"],
    // SC 200 is online with no room: dropped, never guessed.
  ]],
  "ucla-dark.jpg": ["ucla", "jpeg", [
    ["COM SCI 31", M | W, "boelter-hall", "BOELTER 3400"],
    ["MATH 31A", M | W, null, "MS 4000A"],
    ["PSYCH 10", T | R, "franz-hall", "FRANZ 1178"],
    ["LIFESCI 7A", F, "kaplan-hall", "KAPLAN A51"],
  ]],
  "psu-schedule.pdf": ["penn-state", "pdf", [...GRID.slice(0, 4).map((c) => (c[0] === "MATH 140" ? [...c.slice(0, 3), "Thomas Bldg 102"] : c)), ["CAS 100A", M | W, "sackett-building", "Sackett 101"]]],
  "photo-of-screen.jpg": ["penn-state", "jpeg", GRID],
};

let failed = 0;
const fail = (msg) => { failed++; console.log(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const read = (f) => new Uint8Array(fs.readFileSync(`${DIR}/${f}`));
const places = (id) => JSON.parse(fs.readFileSync(`data/campus/${id}.json`, "utf8")).places;
const got = (location, list) => matchBuilding(location, list)?.place.id ?? null;

console.log("Files");
for (const [file, [, kind]] of Object.entries(CASES)) (sniff(read(file).subarray(0, 8)) === kind ? ok : fail)(`${file} sniffs as ${kind}`);
(sniff(read("fake-extension.png").subarray(0, 8)) === null ? ok : fail)("fake-extension.png (text named .png) sniffs as nothing, so it's refused");
const one = pdfPages(read("psu-schedule.pdf"));
(one === 1 ? ok : fail)(`psu-schedule.pdf has ${one} page`);
const four = pdfPages(read("four-pages.pdf"));
(four === 4 && four > MAX_PAGES ? ok : fail)(`four-pages.pdf has ${four} pages, over the ${MAX_PAGES}-page cap`);

console.log("Matcher on each fixture's classes");
for (const [file, [campus, , classes]] of Object.entries(CASES)) {
  const list = places(campus);
  for (const [course, , want, shown] of classes) (got(shown, list) === want ? ok : fail)(`${file} ${course} "${shown}" -> ${got(shown, list) ?? "no match (asks)"}`);
}

console.log("Rate limit (per user, in process)");
const req = new Request("http://localhost/api/hall-finder/parse-schedule");
const hits = Array.from({ length: 6 }, () => rateLimit(req, "check-hf-parse-hour", 5, 3_600_000, "user-check").allowed);
(hits.slice(0, 5).every(Boolean) && !hits[5] ? ok : fail)(`uploads 1–5 allowed, the sixth refused (${hits.map((h) => (h ? "ok" : "429")).join(" ")})`);

const key = process.env.ANTHROPIC_API_KEY;
if (!key) console.log("\nModel reads skipped (no ANTHROPIC_API_KEY).");
else {
  const model = process.env.HALL_FINDER_MODEL || DEFAULT_MODEL;
  console.log(`\nModel reads (${model})`);
  const client = new Anthropic({ apiKey: key });
  let tokens = 0;
  for (const [file, [campus, kind, classes]] of [...Object.entries(CASES), ["not-a-schedule.png", ["penn-state", "png", []]]]) {
    const res = await readSchedule(client, model, kind, read(file));
    if (!res.ok) {
      (classes.length === 0 && res.reason === "not_schedule" ? ok : fail)(`${file}: ${res.reason}`);
      continue;
    }
    tokens += res.usage.input + res.usage.output;
    if (!classes.length) { fail(`${file}: read ${res.classes.length} classes from a non-schedule`); continue; }
    const list = places(campus);
    for (const [course, days, want] of classes) {
      const c = res.classes.find((x) => x.course.toUpperCase().replace(/\s+/g, " ").startsWith(course));
      if (!c) { fail(`${file} ${course}: not read (got ${res.classes.map((x) => x.course).join(" | ")})`); continue; }
      const where = got(c.location, list);
      const line = `${file} ${course} "${c.location}" ${c.days === days ? "" : `days ${c.days}≠${days} `}-> ${where ?? "no match (asks)"} · confidence ${c.confidence}`;
      (where === want && c.days === days ? ok : fail)(line);
    }
    if (res.classes.length > classes.length) fail(`${file}: ${res.classes.length - classes.length} extra classes (${res.classes.map((x) => x.course).join(" | ")})`);
  }
  console.log(`  ${tokens} tokens in all`);
}

const url = process.env.HF_URL;
if (url) {
  console.log(`\nRoute (${url})`);
  const post = async (name, bytes, type = "image/png") => {
    const body = new FormData();
    body.append("file", new Blob([bytes], { type }), name);
    const res = await fetch(`${url}/api/hall-finder/parse-schedule`, { method: "POST", body, headers: { origin: url, "x-dormscape-dev-plan": "free" } });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const anon = await fetch(`${url}/api/hall-finder/parse-schedule`, { method: "POST", headers: { origin: url }, body: new FormData() });
  (anon.status === 401 ? ok : fail)(`signed out -> ${anon.status}`);
  const cross = await fetch(`${url}/api/hall-finder/parse-schedule`, { method: "POST", headers: { origin: "https://evil.example", "x-dormscape-dev-plan": "free" }, body: new FormData() });
  (cross.status === 403 ? ok : fail)(`cross-origin -> ${cross.status}`);
  const big = new Uint8Array(MAX_BYTES + 1024 * 1024);
  big.set(read("psu-grid.png").subarray(0, 8));
  let r = await post("huge.png", big);
  (r.status === 413 && r.json?.error === "too_large" ? ok : fail)(`9 MB file -> ${r.status} ${r.json?.error}`);
  r = await post("fake-extension.png", read("fake-extension.png"));
  (r.status === 415 && r.json?.error === "wrong_type" ? ok : fail)(`fake extension -> ${r.status} ${r.json?.error}`);
  r = await post("four-pages.pdf", read("four-pages.pdf"), "application/pdf");
  (r.status === 422 && r.json?.error === "too_many_pages" ? ok : fail)(`4-page PDF -> ${r.status} ${r.json?.error}`);
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await post(i ? "psu-grid.png" : "not-a-schedule.png", read(i ? "psu-grid.png" : "not-a-schedule.png"))).status);
  (statuses[5] === 429 && statuses.slice(0, 5).every((s) => s !== 429) ? ok : fail)(`six uploads in an hour -> ${statuses.join(" ")} (the sixth is 429)`);
  if (statuses[0] !== 503) (statuses[0] === 422 ? ok : fail)(`non-schedule image through the route -> ${statuses[0]}`);
}

console.log(failed ? `\n${failed} failed` : "\nall schedule checks pass");
process.exit(failed ? 1 : 0);
