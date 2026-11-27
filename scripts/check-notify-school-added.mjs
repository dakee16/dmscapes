// The school-added email and its send script, against a mocked room_submissions table and a fake
// Resend. Never reads a real database or sends mail: every fetch is answered here.
//   node scripts/check-notify-school-added.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { schoolAddedEmail } from "../lib/email-templates.ts";
import { main, matchHall, matchSchool } from "./notify-school-added.mjs";

const school = (id) => JSON.parse(fs.readFileSync(`data/schools/${id}.json`, "utf8"));
const molloy = school("molloy"), bsu = school("bridgewater-state"), ung = school("north-georgia"), sfa = school("stephen-f-austin"), aau = school("academy-of-art");

// 1. Matching a request to the school.
const kind = (name, s) => matchSchool(name, s)?.kind ?? null;
assert.equal(kind("Molloy University", molloy), "exact");
assert.equal(kind("molloy college", molloy), "exact");
assert.equal(kind("MOLLOY UNIVERSITY - Rockville Centre, NY", molloy), "contains");
assert.equal(kind("Moloy University", molloy), "typo");
assert.equal(kind("Stephen F. Austin State University", sfa), "exact");
assert.equal(kind("University of North Georgia", ung), "exact");
assert.equal(kind("Academy of Art", aau), "exact");
assert.equal(kind("BSU", bsu), "acronym", "a bare acronym is held back: it could be another school");
assert.equal(kind("Boise State University", bsu), null);
assert.equal(kind("state university", bsu), null, "generic words alone match nothing");
assert.equal(kind("Hofstra University", molloy), null);
assert.equal(kind("", molloy), null);
assert.deepEqual(matchHall("Bogner", molloy), { id: "bogner-hall", name: "Bogner Hall" });
assert.equal(matchHall("620 Sutter", aau)?.id, "clara-gil-stephens");
assert.equal(matchHall("unknown", molloy), null);
assert.equal(matchHall("Lewis Hall", ung)?.id, "lewis-hall", "an exact hall beats Lewis Annex");

// 2. The email.
const base = { school: { id: "molloy", name: "Molloy University" }, halls: 3, rooms: 14, published: 14, hallFinder: true };
let e = schoolAddedEmail(base);
assert.equal(e.subject, "Molloy University is now on dormscape");
for (const part of [e.subject, e.text, e.html]) assert(!/Dormscape/.test(part), "the brand is lowercase");
for (const p of ["/colleges/molloy?", "/colleges/molloy/hall-finder?", "/plan?school=molloy&amp;utm_source=email"]) assert(e.html.includes(p), `html links ${p}`);
for (const p of ["/colleges/molloy?", "/colleges/molloy/hall-finder?", "/plan?school=molloy&utm_source=email"]) assert(e.text.includes(p), `text links ${p}`);
assert.match(e.text, /3 residence halls and 14 room types/);
assert.match(e.text, /Every one has the size the school publishes/);
assert(!e.html.includes("is in.") && !e.html.includes("dormscape, "), "no hall card or postal line unless given");
e = schoolAddedEmail({ ...base, published: 0, hallFinder: false, requestedHall: { id: "bogner-hall", name: "Bogner <Hall>" }, mailingAddress: " 1 Elm St, Town, NY 11570 " });
assert.match(e.text, /doesn't publish room sizes/);
assert(!e.html.includes("hall-finder") && !e.text.includes("hall-finder"), "no Hall Finder link for a school without it");
assert(e.html.includes("Bogner &lt;Hall&gt; is in.") && e.html.includes("/colleges/molloy/bogner-hall?"), "the requested hall, escaped and linked");
assert(e.html.includes("/plan?school=molloy&amp;dorm=bogner-hall&amp;utm_source"), "the button plans that hall");
assert(e.html.includes("dormscape, 1 Elm St, Town, NY 11570") && e.text.includes("dormscape, 1 Elm St, Town, NY 11570"), "postal line when set");
assert.match(schoolAddedEmail({ ...base, published: 9 }).text, /9 have the size the school publishes; the rest are estimates/);
assert.match(schoolAddedEmail({ ...base, halls: 1, rooms: 1, published: 1 }).text, /1 residence hall and 1 room type\./);

// 3. The send script, with fetch mocked.
const rows = [
  { id: 1, email: "A.Student@Example.test", college_name: "Molloy University", dorm_name: "unknown", created_at: "2026-10-01" },
  { id: 2, email: "a.student@example.test", college_name: "molloy", dorm_name: "Bogner", created_at: "2026-10-02" },
  { id: 3, email: "second@example.test", college_name: "Molloy College (Rockville Centre)", dorm_name: null, created_at: "2026-10-03" },
  { id: 4, email: "other@example.test", college_name: "Hofstra University", dorm_name: "unknown", created_at: "2026-10-04" },
  { id: 5, email: "not-an-email", college_name: "Molloy University", dorm_name: "unknown", created_at: "2026-10-05" },
];
const batches = [];
let dbReads = 0;
global.fetch = async (url, options = {}) => {
  url = String(url);
  if (url.startsWith("https://fake-supabase.example.test/rest/v1/room_submissions")) {
    assert.equal(options.method ?? "GET", "GET", "the script only reads room_submissions");
    dbReads++;
    const u = new URL(url), offset = Number(u.searchParams.get("offset") ?? 0), limit = Number(u.searchParams.get("limit") ?? 1000);
    return new Response(JSON.stringify(rows.slice(offset, offset + limit)), { status: 200, headers: { "content-type": "application/json" } });
  }
  assert.equal(url, "https://api.resend.com/emails/batch", `unexpected fetch ${url}`);
  const body = JSON.parse(options.body);
  batches.push({ body, headers: options.headers });
  return new Response(JSON.stringify({ data: body.map((_, i) => ({ id: `em_${batches.length}_${i}` })) }), { status: 200 });
};
const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "school-added-check-"));
const run = async (args, env = {}) => {
  const lines = [], saved = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: "https://fake-supabase.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service-key", RESEND_API_KEY: "fake-resend-key" }, env);
  try { return { code: await main(args, { logDir, pauseMs: 0, sleep: async () => {}, log: (l) => lines.push(l) }), out: lines.join("\n") }; }
  finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
};

let r = await run(["--school", "molloy"]);
assert.equal(r.code, 0, r.out);
assert.match(r.out, /5 requests read, 3 match/);
assert.match(r.out, /2 unique address\(es\), 0 already sent/, "one email per address");
assert.match(r.out, /a\*\*\*@example\.test/);
assert(!/a\.student@|second@/.test(r.out), "the dry run redacts addresses");
assert.match(r.out, /Molloy University is now on dormscape" \(3 halls, \d+ room types, \d+ published, Hall Finder yes\)/);
assert.equal(batches.length, 0, "a dry run sends nothing");

assert.equal((await run(["--school", "nope"])).code, 1);
assert.equal((await run(["--school", "molloy", "--send", "--test", "x@example.test"])).code, 1, "one mode at a time");
const reads = dbReads;
r = await run(["--school", "molloy", "--send"]);
assert.equal(r.code, 1); assert.match(r.out, /CONFIRM_SEND=yes/);
assert.equal(dbReads, reads, "refusals happen before reading the table"); assert.equal(batches.length, 0);

r = await run(["--school", "molloy", "--send"], { CONFIRM_SEND: "yes" });
assert.equal(r.code, 0, r.out);
assert.equal(batches.length, 1);
const sent = batches[0];
assert.deepEqual(sent.body.map((m) => m.to[0]).sort(), ["a.student@example.test", "second@example.test"]);
assert.match(sent.headers["Idempotency-Key"], /^school-added\/molloy\/[0-9a-f]{40}$/);
const toA = sent.body.find((m) => m.to[0] === "a.student@example.test");
assert(toA.html.includes("Bogner Hall is in.") && toA.html.includes("dorm=bogner-hall"), "the request that named a hall gets it");
assert(!sent.body.find((m) => m.to[0] === "second@example.test").html.includes(" is in."), "no hall card without a named hall");
assert.equal(toA.from, "dormscape <contact@dormscape.us>");
const logText = fs.readFileSync(path.join(logDir, "notify-molloy.jsonl"), "utf8");
assert.equal(logText.trim().split("\n").length, 2); assert(!logText.includes("@"), "the sent-log holds hashes, not addresses");

r = await run(["--school", "molloy", "--send"], { CONFIRM_SEND: "yes" });
assert.equal(r.code, 0); assert.equal(batches.length, 1, "everyone in the log is skipped"); assert.match(r.out, /2 already sent per \S+, 0 to send/);

r = await run(["--school", "bridgewater-state", "--emails", "x@example.test, X@example.test,y@example.test", "--hall", "scott-hall", "--send"], { CONFIRM_SEND: "yes" });
assert.equal(r.code, 0, r.out); assert.equal(batches.length, 2);
assert.deepEqual(batches[1].body.map((m) => m.to[0]), ["x@example.test", "y@example.test"]);
assert(batches[1].body.every((m) => m.subject === "Bridgewater State University is now on dormscape" && m.html.includes("Scott Hall is in.")));
assert.equal((await run(["--school", "molloy", "--emails", "nope"])).code, 1);
assert.equal((await run(["--school", "molloy", "--hall", "nope", "--test", "t@example.test"])).code, 1);

rows.push({ id: 6, email: "bsu@example.test", college_name: "BSU", dorm_name: "unknown", created_at: "2026-10-06" });
r = await run(["--school", "bridgewater-state"]);
assert.match(r.out, /0 match, 1 acronym-only held back/); assert.match(r.out, /\[held back\]/);
r = await run(["--school", "bridgewater-state", "--with-acronyms"]);
assert.match(r.out, /1 match/);

r = await run(["--school", "molloy", "--test", "me@example.test", "--hall", "bogner-hall"]);
assert.equal(r.code, 0, r.out); assert.equal(batches.length, 3); assert.deepEqual(batches[2].body[0].to, ["me@example.test"]);

fs.rmSync(logDir, { recursive: true, force: true });
console.log("PASS: school-added email (counts, links, hall, lowercase brand) and its send script (matching, dedupe, dry run, confirm, resume) with mocks.");
