// Tells the people who asked for a school (the Add-my-school form, room_submissions) that it's
// live, with schoolAddedEmail in lib/email-templates.ts. A one-time transactional reply. Dry run
// unless told otherwise. Run from the repo root, after the school is deployed:
//
//   node --env-file=.env.local scripts/notify-school-added.mjs --school molloy
//       dry run: each matching request (redacted) and how it matched, sends nothing
//   node --env-file=.env.local scripts/notify-school-added.mjs --school molloy --test you@example.com [--hall bogner-hall]
//       one email to you
//   CONFIRM_SEND=yes node --env-file=.env.local scripts/notify-school-added.mjs --school molloy --send
//       the real send to every matched requester
//   ... --emails a@x.edu,b@y.edu [--hall <dormId>]
//       explicit recipients instead of the table (use after reviewing a dry run)
//
// Requests match the school by name or alias (case, punctuation and small typos ignored). A request
// that matches only by a short acronym ("bsu", "aau") could be another school, so it is listed but
// left out unless --with-acronyms. room_submissions is only read (service role). Each accepted
// address goes in qa-tmp/notify-<school>.jsonl as a SHA-256 hash and is skipped on later runs.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { schoolAddedEmail } from "../lib/email-templates.ts";
import { postBatch, redact } from "./send-campaign.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const hash = (email) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/&/g, " and ").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const GENERIC = new Set(["the", "of", "at", "and", "university", "college", "state", "campus", "school", "univ"]);
const isAcronym = (v) => !v.includes(" ") && v.length < 5;

function similarity(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

/** How a request's college name matches the school: { kind, via } or null. kind is exact,
 * contains, typo or acronym (acronym-only matches are held back by default). */
export function matchSchool(collegeName, school) {
  const r = norm(collegeName);
  if (!r) return null;
  const variants = [...new Set([school.college_name, ...(school.aliases ?? [])].map(norm).filter(Boolean))];
  const long = variants.filter((v) => !isAcronym(v));
  const exact = long.find((v) => v === r);
  if (exact) return { kind: "exact", via: exact };
  const acronym = variants.filter(isAcronym).find((v) => v === r);
  if (acronym) return { kind: "acronym", via: acronym };
  // "Molloy University, Rockville Centre" holds "molloy university"; "north georgia" sits inside
  // "university of north georgia" (only when the request has a word that isn't generic).
  const contains = long.find((v) => ` ${r} `.includes(` ${v} `))
    ?? (r.split(" ").some((w) => !GENERIC.has(w)) && r.includes(" ") ? long.find((v) => ` ${v} `.includes(` ${r} `)) : undefined);
  if (contains) return { kind: "contains", via: contains };
  const typo = long.find((v) => v.length >= 8 && similarity(r, v) >= 0.85);
  return typo ? { kind: "typo", via: typo } : null;
}

const core = (s) => norm(s).replace(/\b(the|residence|hall|halls|house|building)\b/g, " ").replace(/\s+/g, " ").trim();
/** The school's hall a request names ("Bogner", "620 Sutter"), or null. */
export function matchHall(dormName, school) {
  const r = core(dormName);
  if (!r || r === "unknown") return null;
  const d = school.dorms.find((x) => core(x.dorm_name) === r)
    ?? (r.length >= 4 ? school.dorms.find((x) => ` ${core(x.dorm_name)} `.includes(` ${r} `)) : undefined);
  return d ? { id: d.dorm_id, name: d.dorm_name } : null;
}

async function readRequests() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("room_submissions").select("id,email,college_name,dorm_name,created_at")
      .not("email", "is", null).order("created_at").range(from, from + 999);
    if (error) throw new Error(`Couldn't read room_submissions: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function main(argv, {
  logDir = path.join(ROOT, "qa-tmp"),
  pauseMs = 1000,
  log = console.log,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const refuse = (why) => (log(`Refusing: ${why}`), 1);
  let o;
  try {
    o = parseArgs({ args: argv, options: {
      school: { type: "string" }, emails: { type: "string" }, hall: { type: "string" },
      "dry-run": { type: "boolean" }, send: { type: "boolean" }, test: { type: "string" }, "with-acronyms": { type: "boolean" },
    } }).values;
  } catch (err) {
    return refuse(err.message);
  }
  if ([o.send, o.test !== undefined, o["dry-run"]].filter(Boolean).length > 1) return refuse("pick one of --dry-run, --test and --send.");
  if (!o.school || !/^[a-z0-9-]+$/.test(o.school)) return refuse("--school needs a school id (data/schools/<id>.json).");
  const entry = read("lib/schools-index.json").find((s) => s.id === o.school);
  if (!entry || !fs.existsSync(path.join(ROOT, `data/schools/${o.school}.json`))) return refuse(`"${o.school}" isn't in lib/schools-index.json. Add and deploy the school first.`);
  const school = read(`data/schools/${o.school}.json`);
  const allRooms = entry.dorms.flatMap((d) => d.rooms);
  const stats = {
    school: { id: entry.id, name: entry.name },
    halls: entry.dorms.length,
    rooms: allRooms.length,
    published: allRooms.filter((r) => r.length_ft && r.width_ft && !r.dims_estimated).length,
    hallFinder: read("data/campus/index.json").includes(entry.id),
    mailingAddress: process.env.MARKETING_MAILING_ADDRESS,
  };
  let hall = null;
  if (o.hall !== undefined) {
    const d = school.dorms.find((x) => x.dorm_id === o.hall);
    if (!d) return refuse(`--hall "${o.hall}" isn't a ${o.school} hall id.`);
    hall = { id: d.dorm_id, name: d.dorm_name };
  }
  const from = process.env.CONTACT_FROM_EMAIL || "dormscape <contact@dormscape.us>";
  const message = (email, requestedHall) => ({ from, to: [email], ...schoolAddedEmail({ ...stats, requestedHall }), tags: [{ name: "email", value: "school_added" }, { name: "school", value: o.school }] });

  if (o.test !== undefined) {
    if (!EMAIL_RE.test(o.test)) return refuse("--test needs an email address.");
    if (!process.env.RESEND_API_KEY) return refuse("RESEND_API_KEY isn't set.");
    try {
      const [sent] = await postBatch([message(o.test, hall)], null, sleep, log);
      log(`Test for ${o.school} accepted for ${o.test}, from ${from}. Resend id ${sent?.id ?? "unknown"}.`);
      return 0;
    } catch (err) {
      log(`Test failed: ${err.message}`);
      return 1;
    }
  }
  if (o.send) {
    if (process.env.CONFIRM_SEND !== "yes") return refuse("this is a real send. Set CONFIRM_SEND=yes to go ahead.");
    if (!process.env.RESEND_API_KEY) return refuse("RESEND_API_KEY isn't set.");
  }

  // Recipients: explicit addresses, or the requests that match the school.
  let recipients;
  if (o.emails !== undefined) {
    const list = o.emails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const bad = list.filter((e) => !EMAIL_RE.test(e));
    if (bad.length || !list.length) return refuse(`--emails has ${bad.length ? `${bad.length} invalid address(es)` : "no addresses"}.`);
    recipients = [...new Set(list)].map((email) => ({ email, hall }));
    log(`${o.school}: ${recipients.length} address(es) from --emails.`);
  } else {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return refuse("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to read room_submissions. Run with --env-file=.env.local.");
    const rows = await readRequests();
    const matched = [];
    const held = [];
    for (const row of rows) {
      const m = matchSchool(row.college_name, school);
      if (!m) continue;
      const email = String(row.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) continue;
      const item = { email, hall: matchHall(row.dorm_name, school), m, row };
      (m.kind === "acronym" && !o["with-acronyms"] ? held : matched).push(item);
    }
    const show = (x) => `  ${redact(x.email).padEnd(26)} "${x.row.college_name}" -> ${x.m.kind} ("${x.m.via}")${x.hall ? `, hall ${x.hall.name}` : x.row.dorm_name && x.row.dorm_name !== "unknown" ? `, hall "${x.row.dorm_name}" (no match)` : ""}`;
    log(`${o.school} (${school.college_name}): ${rows.length} requests read, ${matched.length} match${held.length ? `, ${held.length} acronym-only held back (--with-acronyms includes them)` : ""}.`);
    for (const x of matched) log(show(x));
    for (const x of held) log(`${show(x)}  [held back]`);
    // One email per address; a request that names one of the school's halls wins.
    const byEmail = new Map();
    for (const x of matched) if (!byEmail.has(x.email) || (!byEmail.get(x.email).hall && x.hall)) byEmail.set(x.email, x);
    recipients = [...byEmail.values()].map(({ email, hall: h }) => ({ email, hall: h }));
  }

  const logFile = path.join(logDir, `notify-${o.school}.jsonl`);
  const shownLog = path.relative(ROOT, logFile);
  const done = new Set(fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).email_sha256) : []);
  const todo = recipients.filter((r) => !done.has(hash(r.email)));
  log(`${recipients.length} unique address(es), ${recipients.length - todo.length} already sent per ${shownLog}, ${todo.length} to send. `
    + `Email: "${schoolAddedEmail(stats).subject}" (${stats.halls} halls, ${stats.rooms} room types, ${stats.published} published, Hall Finder ${stats.hallFinder ? "yes" : "no"}). From: ${from}.`);
  if (!o.send) {
    log("Dry run: nothing sent.");
    return 0;
  }

  const emails = todo.map((r) => message(r.email, r.hall));
  fs.mkdirSync(logDir, { recursive: true });
  let sent = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    if (i) await sleep(pauseMs);
    const chunk = todo.slice(i, i + BATCH);
    const key = `school-added/${o.school}/${createHash("sha256").update(chunk.map((r) => hash(r.email)).join(",")).digest("hex").slice(0, 40)}`;
    try {
      const ids = await postBatch(emails.slice(i, i + BATCH), key, sleep, log);
      const at = new Date().toISOString();
      fs.appendFileSync(logFile, chunk.map((r, j) => JSON.stringify({ email_sha256: hash(r.email), resend_id: ids[j]?.id ?? null, at })).join("\n") + "\n");
      sent += chunk.length;
      log(`  batch ${i / BATCH + 1}: ${chunk.length} accepted (${sent}/${todo.length})`);
    } catch (err) {
      log(`  batch ${i / BATCH + 1} failed: ${err.message}`);
      log(`Stopped: ${sent} sent this run, ${todo.length - sent} not sent. Run the same command again; it skips everyone in ${shownLog}.`);
      return 1;
    }
  }
  log(`Done: ${sent} sent, ${recipients.length - todo.length} skipped as already sent. Log: ${shownLog}.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
