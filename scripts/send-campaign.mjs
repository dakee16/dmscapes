// Sends a dormscape marketing email (campaignEmail in lib/email-templates.ts) to
// every profile with marketing_opt_in_at set. Dry run unless told otherwise.
// Run from the repo root:
//
//   node --env-file=.env.local scripts/send-campaign.mjs --campaign bf2026-launch
//       dry run: recipient count and redacted samples, sends nothing
//   node --env-file=.env.local scripts/send-campaign.mjs --campaign bf2026-launch --test you@example.com
//       one email to you (its unsubscribe link points at a user that doesn't exist)
//   MARKETING_MAILING_ADDRESS="..." CONFIRM_SEND=yes node --env-file=.env.local scripts/send-campaign.mjs --send --campaign bf2026-launch
//       the real send
//
// --option b picks the second subject and preheader. Profiles are only read
// (service role). Resend's batch API takes 100 emails a request; batches are
// paced and 429s wait out retry-after. Each accepted recipient's user id goes in
// qa-tmp/campaign-<campaign>.jsonl and is skipped on later runs, so running the
// same command again after a failure resumes without double-sending.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { CAMPAIGNS, MAILING_ADDRESS_PLACEHOLDER, campaignEmail } from "../lib/email-templates.ts";
import { unsubscribeUrls } from "../lib/unsubscribe.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 100;
const TEST_USER = "00000000-0000-0000-0000-000000000000";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const redact = (email) => `${email[0]}***@${email.split("@").pop()}`;

async function readRecipients() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("profiles").select("id,email")
      .not("marketing_opt_in_at", "is", null).not("email", "is", null).order("id").range(from, from + 999);
    if (error) throw new Error(`Couldn't read profiles: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function message(campaign, recipient, { from, address, option }) {
  const urls = unsubscribeUrls(recipient.id);
  return {
    from,
    to: [recipient.email],
    ...campaignEmail(campaign, { unsubscribeUrl: urls.page, mailingAddress: address, option }),
    headers: { "List-Unsubscribe": `<${urls.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    tags: [{ name: "campaign", value: campaign }],
  };
}

async function postBatch(emails, idempotencyKey, sleep, log) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(emails),
      signal: AbortSignal.timeout(30_000),
    });
    const wait = Number(res.headers.get("retry-after") ?? 2);
    // A long retry-after is a daily or monthly quota: stop, and resume later.
    if (res.status === 429 && attempt < 6 && wait <= 60) {
      log(`  rate limited, waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend answered ${res.status}: ${body.message ?? body.name ?? "no detail"}`);
    return body.data ?? [];
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
      "dry-run": { type: "boolean" }, send: { type: "boolean" }, test: { type: "string" },
      campaign: { type: "string" }, option: { type: "string", default: "a" },
    } }).values;
  } catch (err) {
    return refuse(err.message);
  }
  if ([o.send, o.test !== undefined, o["dry-run"]].filter(Boolean).length > 1) return refuse("pick one of --dry-run, --test and --send.");
  if (o.send && !o.campaign) return refuse(`--send needs --campaign ${CAMPAIGNS.join(" or ")}.`);
  const campaign = o.campaign ?? CAMPAIGNS[0];
  if (!CAMPAIGNS.includes(campaign)) return refuse(`unknown campaign "${campaign}". Use ${CAMPAIGNS.join(" or ")}.`);
  if (o.option !== "a" && o.option !== "b") return refuse("--option is a or b.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return refuse("SUPABASE_SERVICE_ROLE_KEY isn't set (it signs the unsubscribe links). Run with --env-file=.env.local.");
  const address = process.env.MARKETING_MAILING_ADDRESS?.trim();
  const settings = { from: process.env.CONTACT_FROM_EMAIL || "dormscape <contact@dormscape.us>", address, option: o.option };

  if (o.test !== undefined) {
    if (!EMAIL_RE.test(o.test)) return refuse("--test needs an email address.");
    if (!process.env.RESEND_API_KEY) return refuse("RESEND_API_KEY isn't set.");
    if (!address) log(`Note: MARKETING_MAILING_ADDRESS isn't set, so the footer shows ${MAILING_ADDRESS_PLACEHOLDER}. --send refuses until it's set.`);
    try {
      const [sent] = await postBatch([message(campaign, { id: TEST_USER, email: o.test }, settings)], null, sleep, log);
      log(`Test of ${campaign} (option ${o.option}) accepted for ${o.test}, from ${settings.from}. Resend id ${sent?.id ?? "unknown"}.`);
      return 0;
    } catch (err) {
      log(`Test failed: ${err.message}`);
      return 1;
    }
  }

  if (o.send) {
    if (process.env.CONFIRM_SEND !== "yes") return refuse("this is a real send. Set CONFIRM_SEND=yes to go ahead.");
    if (!address) return refuse(`MARKETING_MAILING_ADDRESS isn't set. The footer needs a postal address (CAN-SPAM); it would show ${MAILING_ADDRESS_PLACEHOLDER}.`);
    if (!process.env.RESEND_API_KEY) return refuse("RESEND_API_KEY isn't set.");
  }
  if (!process.env.SUPABASE_URL) return refuse("SUPABASE_URL isn't set. Run with --env-file=.env.local.");

  const logFile = path.join(logDir, `campaign-${campaign}.jsonl`);
  const shownLog = path.relative(ROOT, logFile);
  const done = new Set(fs.existsSync(logFile)
    ? fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line).id)
    : []);
  const rows = await readRecipients();
  const valid = rows.filter((r) => EMAIL_RE.test(r.email));
  const todo = valid.filter((r) => !done.has(r.id));
  log(`${campaign}: ${valid.length} opted-in recipients${rows.length > valid.length ? ` (${rows.length - valid.length} unusable addresses left out)` : ""}, `
    + `${valid.length - todo.length} already sent per ${shownLog}, ${todo.length} to send. From: ${settings.from}.`);

  if (!o.send) {
    log(`Samples: ${todo.slice(0, 5).map((r) => redact(r.email)).join(", ") || "none"}`);
    if (!address) log("MARKETING_MAILING_ADDRESS isn't set; --send will refuse until it is.");
    log("Dry run: nothing sent.");
    return 0;
  }

  // Render every email before sending any, so a template problem stops the run at zero.
  const emails = todo.map((r) => message(campaign, r, settings));
  if (emails.some((e) => e.html.includes(MAILING_ADDRESS_PLACEHOLDER) || e.text.includes(MAILING_ADDRESS_PLACEHOLDER))) {
    return refuse("the mailing address placeholder is still in the email.");
  }
  fs.mkdirSync(logDir, { recursive: true });
  let sent = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    if (i) await sleep(pauseMs);
    const chunk = todo.slice(i, i + BATCH);
    // Same recipients, same key: Resend drops a repeat of a batch it already accepted (24 hours).
    const key = `${campaign}/${createHash("sha256").update(chunk.map((r) => r.id).join(",")).digest("hex").slice(0, 40)}`;
    try {
      const ids = await postBatch(emails.slice(i, i + BATCH), key, sleep, log);
      const at = new Date().toISOString();
      fs.appendFileSync(logFile, chunk.map((r, j) => JSON.stringify({ id: r.id, resend_id: ids[j]?.id ?? null, at })).join("\n") + "\n");
      sent += chunk.length;
      log(`  batch ${i / BATCH + 1}: ${chunk.length} accepted (${sent}/${todo.length})`);
    } catch (err) {
      log(`  batch ${i / BATCH + 1} failed: ${err.message}`);
      log(`Stopped: ${sent} sent this run, ${todo.length - sent} not sent. Fix the cause and run the same command again; it skips everyone in ${shownLog}.`);
      return 1;
    }
  }
  log(`Done: ${sent} sent this run, ${valid.length - todo.length} skipped as already sent. Log: ${shownLog}.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
