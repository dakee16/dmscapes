// The synthetic .ics fixtures in scripts/fixtures/ parse and match campus buildings.
//   node scripts/check-hall-finder-ics.mjs
// Imports lib/ics.ts directly (Node strips the types); no real student schedules here.
import fs from "node:fs";
import { parseIcs, matchBuilding, buildingText } from "../lib/ics.ts";

const M = 1, T = 2, W = 4, R = 8, F = 16;
const CASES = {
  "penn-state-basic.ics": ["penn-state", [
    ["ECON 102", M | W | F, "willard-building", true],
    ["MATH 140", T | R, "joab-l-thomas-building", true],
    ["PSYCH 100", M | W | F, "forum-building", true],
    ["CHEM 110", T | R, "osmond-laboratory", true],
  ]],
  // Folded SUMMARY, an escaped comma, two sections merged, a typo'd building, a Saturday event dropped.
  "penn-state-folded.ics": ["penn-state", [
    ["HIST 021 Lecture: American History to 1877", M | W | F, "boucke-building", true],
    ["PHYS 211", T | R, "osmond-laboratory", false],
  ]],
  // No RRULE: days from each DTSTART, duplicates merged, "Online" matches nothing.
  "ucla-single-events.ics": ["ucla", [
    ["COM SCI 31", M | W, "boelter-hall", true],
    ["PSYCH 10", T, "royce-hall", true],
    ["Study group", R, null, null],
  ]],
};

let failed = 0;
const fail = (msg) => { failed++; console.log(`  ✗ ${msg}`); };
if (buildingText("WILLARD 062") !== "WILLARD") fail(`buildingText("WILLARD 062") = "${buildingText("WILLARD 062")}"`);
for (const [file, [collegeId, expected]] of Object.entries(CASES)) {
  const places = JSON.parse(fs.readFileSync(`data/campus/${collegeId}.json`, "utf8")).places;
  const classes = parseIcs(fs.readFileSync(`scripts/fixtures/${file}`, "utf8"));
  console.log(`${file}: ${classes.length} classes`);
  if (classes.length !== expected.length) fail(`expected ${expected.length} classes, got ${classes.map((c) => c.course).join(" | ")}`);
  for (const [course, days, placeId, sure] of expected) {
    const c = classes.find((x) => x.course === course);
    if (!c) { fail(`${course}: missing`); continue; }
    if (c.days !== days) fail(`${course}: days ${c.days}, expected ${days}`);
    const m = matchBuilding(c.location, places);
    const got = m ? `${m.place.id}${m.sure ? "" : " (unsure)"}` : "no match";
    const want = placeId ? `${placeId}${sure ? "" : " (unsure)"}` : "no match";
    if (got !== want) fail(`${course} "${c.location}": ${got}, expected ${want}`);
    else console.log(`  ✓ ${course} "${c.location}" -> ${got}`);
  }
}
console.log(failed ? `\n${failed} failed` : "\nall fixtures parse and match");
process.exit(failed ? 1 : 0);
