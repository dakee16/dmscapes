// Run with: node scripts/check-dorm-sizes.cjs
// The /dorm-room-size numbers: quantiles, which listings count as dorm rooms,
// and sane results on the shipped school index.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const file = path.join(__dirname, "../lib/dorm-sizes.ts");
const mod = { exports: {} };
new Function("module", "exports", ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod, mod.exports);
const { quantile, isDormRoom, dormSizeStats } = mod.exports;

assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75);
assert.equal(quantile([7], 0.75), 7);

const room = (o) => ({ type: "double", label: "Double", occupants: 2, length_ft: 16, width_ft: 12, sqft: null, bed_size: "twin_xl", dims_estimated: false, ...o });
assert.equal(isDormRoom(room({}), "Elder Hall"), true);
assert.equal(isDormRoom(room({ dims_estimated: true }), "Elder Hall"), false, "estimates never count");
assert.equal(isDormRoom(room({ occupants: null }), "Elder Hall"), false);
assert.equal(isDormRoom(room({ occupants: 4, sqft: 400 }), "Elder Hall"), false, "quads are mostly suites");
assert.equal(isDormRoom(room({}), "Graduate Tower"), false, "graduate housing is out");
assert.equal(isDormRoom(room({ label: "Studio Apartment" }), "Elder Hall"), false, "studios are out");
assert.equal(isDormRoom(room({ sqft: 650 }), "Elder Hall"), false, "325 sq ft a person is a whole apartment");

const schools = JSON.parse(fs.readFileSync(path.join(__dirname, "../lib/schools-index.json"), "utf8"));
const s = dormSizeStats(schools);
const [single, double, triple] = s.byType;
assert.deepEqual(s.byType.slice(0, 3).map((t) => t.occupants), [1, 2, 3]);
assert.ok(single.median < double.median && double.median < triple.median, "rooms grow with occupants");
assert.equal(s.byType.length, 3, "singles, doubles and triples only");
for (const t of s.byType) {
  assert.ok(t.p25 <= t.median && t.median <= t.p75);
  assert.ok(Math.abs(t.lengthFt * t.widthFt - t.median) <= t.median * 0.03, "typical size matches the median area");
}
assert.ok(s.doublesBySchool.every((x, i, a) => x.rooms >= 3 && (i === 0 || a[i - 1].median >= x.median)), "schools with 3+ doubles, largest first");
assert.ok(s.rooms > 1000 && s.twinXlShare > 0.9 && s.twinXlShare <= 1);
const d = (t) => `${t.lengthFt} x ${t.widthFt} ft (${t.median} sq ft)`;
console.log(`PASS: ${s.rooms} published rooms from ${s.schools} schools. Typical single ${d(single)}, double ${d(double)}, triple ${d(triple)}.`);
