// Run with: node --test scripts/check-gifts.cjs
// Gift a plan, end to end through the real checkout, webhook, redeem and billing routes, with an
// in-memory database, a Stripe test double and a fake Resend. No live payments, email or database
// writes. The migration itself runs in a throwaway local PGlite database.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file);
  if (!path.extname(file)) file += ".ts";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const resolve = id => Object.hasOwn(mocks, id) ? mocks[id]
    : id.startsWith("@/") ? load(id.slice(2), mocks, cache)
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id), mocks, cache) : require(id);
  new Function("require", "module", "exports", "console", code)(resolve, module, module.exports, { ...console, error() {}, warn() {} });
  return module.exports;
}

// ---------- An in-memory database with PostgREST's shape: each statement applies atomically ----------
function database({ giftTable = true } = {}) {
  const db = { profiles: new Map(), events: new Set(), gifts: [], giftTable };
  const UNIQUE = { gift_codes: ["code_hash", "stripe_session_id"] };
  const rowsOf = table => table === "profiles" ? [...db.profiles.values()] : table === "gift_codes" ? db.gifts
    : table === "processed_stripe_events" ? [...db.events].map(event_id => ({ event_id })) : [];
  db.from = table => {
    let op = "select", values;
    const filters = [];
    const match = row => filters.every(([k, kind, v]) =>
      kind === "eq" || kind === "is" ? (row[k] ?? null) === v : kind === "notnull" ? row[k] != null : v.includes(row[k]));
    const run = async single => {
      await Promise.resolve(); // concurrent requests interleave here; the statement below is atomic
      if (table === "gift_codes" && !db.giftTable) return { data: null, error: { code: "42P01", message: "relation does not exist" } };
      if (op === "insert") {
        if (table === "processed_stripe_events") {
          if (db.events.has(values.event_id)) return { data: null, error: { code: "23505" } };
          db.events.add(values.event_id);
          return { data: null, error: null };
        }
        if (UNIQUE[table]?.some(k => rowsOf(table).some(r => r[k] === values[k]))) return { data: null, error: { code: "23505" } };
        db.gifts.push({ id: `gift_${db.gifts.length + 1}`, created_at: new Date().toISOString(), emailed_at: null, redeemed_by: null, redeemed_at: null, voided_at: null, ...values });
        return { data: null, error: null };
      }
      const rows = rowsOf(table).filter(match);
      if (op === "delete") {
        if (table === "processed_stripe_events") for (const r of rows) db.events.delete(r.event_id);
        return { data: null, error: null };
      }
      if (op === "update") for (const r of rows) Object.assign(r, values);
      const data = rows.map(r => ({ ...r }));
      if (!single) return { data, error: null };
      if (data.length > 1) return { data: null, error: { message: "more than one row" } };
      return { data: data[0] ?? null, error: null };
    };
    const q = {
      select() { return q; }, limit() { return q; },
      insert(v) { op = "insert"; values = v; return q; },
      update(v) { op = "update"; values = v; return q; },
      delete() { op = "delete"; return q; },
      eq(k, v) { filters.push([k, "eq", v]); return q; },
      is(k, v) { filters.push([k, "is", v]); return q; },
      not(k) { filters.push([k, "notnull"]); return q; },
      in(k, v) { filters.push([k, "in", v]); return q; },
      maybeSingle: () => run(true), single: () => run(true),
      then: (resolve, reject) => run(false).then(resolve, reject),
    };
    return q;
  };
  db.profile = (id, plan = "free", credits = null, extra = {}) =>
    db.profiles.set(id, { id, plan, plan_credits_remaining: credits, free_plans_used: 0, email: `${id}@example.test`, stripe_customer_id: null, ...extra });
  return db;
}

// ---------- Routes with injected boundaries ----------
const ctx = { db: null, user: "buyer", stripe: null };
const afterTasks = [];
const mocks = {
  "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) }, after: fn => afterTasks.push(fn) },
  "@/lib/supabase-server": { getServiceClient: () => ctx.db },
  "@/lib/supabase-auth": { getUserId: async () => ctx.user },
  "@/lib/rate-limit": { rateLimit: () => ({ allowed: true }) },
  "@/lib/stripe": { getStripe: () => ctx.stripe },
};
const cache = new Map();
const checkout = load("app/api/checkout/route.ts", mocks, cache).POST;
const webhook = load("app/api/stripe/webhook/route.ts", mocks, cache).POST;
const redeemRoute = load("app/api/gift/redeem/route.ts", mocks, cache).POST;
const invoicesRoute = load("app/api/account/invoices/route.ts", mocks, cache).POST;
const gifts = load("lib/gift-codes.ts", mocks, cache);
const giftLib = load("lib/gift.ts", mocks, cache);
const templates = load("lib/email-templates.ts", mocks, cache);
const plan = load("lib/plan.ts", mocks, cache);

process.env.STRIPE_WEBHOOK_SECRET = "test-only-secret";
process.env.RESEND_API_KEY = "test-only-key";
delete process.env.NEXT_PUBLIC_SITE_URL;
delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
delete process.env.NEXT_PUBLIC_SALE;

// Resend (and anything else fetched) goes here; resendOk = false makes Resend refuse.
const sends = [];
let resendOk = true;
global.fetch = async (url, init) => {
  if (String(url) === "https://api.resend.com/emails") {
    sends.push({ body: JSON.parse(init.body), key: init.headers["Idempotency-Key"] });
    return new Response("{}", { status: resendOk ? 200 : 503 });
  }
  return new Response(null, { status: 200 });
};

const post = (url, body, headers = {}) => new Request(`https://dormscape.test${url}`, { method: "POST", headers, body: JSON.stringify(body) });
const SALE_START = Date.parse("2026-11-26T05:00:00Z");
const SALE_END = Date.parse("2026-12-01T05:00:00Z");
async function at(ms, fn) {
  const now = Date.now;
  Date.now = () => ms;
  try { return await fn(); } finally { Date.now = now; }
}

/** Checkout a gift as `buyer`; returns the Stripe session args. */
async function buyGift(db, type = "gift_pro", gift = { to: "Friend@Example.com", from: "Maya", message: "Can't wait to see <your> room." }, ms = SALE_END + 1) {
  let created = null;
  ctx.db = db; ctx.user = "buyer";
  ctx.stripe = { checkout: { sessions: { create: async args => { created = args; return { url: "https://checkout.stripe.com/test" }; } } } };
  const res = await at(ms, () => checkout(post("/api/checkout", { type, gift })));
  return { res, created };
}

let sessionCount = 0;
/** Stripe confirms the payment for `created` (checkout args); returns a function that delivers the event. */
function paid(db, created, type = "checkout.session.completed") {
  const n = ++sessionCount;
  const session = { id: `cs_gift_${n}`, payment_status: "paid", payment_intent: `pi_gift_${n}`, customer: "cus_buyer", amount_total: created.line_items[0].price_data.unit_amount, currency: "usd", metadata: created.metadata };
  const pi = { id: session.payment_intent, customer: "cus_buyer", metadata: created.payment_intent_data.metadata };
  const deliver = async (eventType = type) => {
    ctx.db = db;
    ctx.stripe = { webhooks: { constructEvent: () => ({ type: eventType, data: { object: session } }) } };
    return webhook(post("/api/stripe/webhook", "x", { "stripe-signature": "s" }));
  };
  return { session, pi, deliver };
}

/** A refund or dispute event for a payment. `charges` are what Stripe lists for a customer. */
function reversal(db, type, object, pis, charges = {}) {
  ctx.db = db;
  ctx.stripe = {
    webhooks: { constructEvent: () => ({ type, data: { object } }) },
    paymentIntents: { retrieve: async id => pis[id] },
    charges: { list: async ({ customer }) => ({ data: charges[customer] ?? [] }) },
  };
  return webhook(post("/api/stripe/webhook", "x", { "stripe-signature": "s" }));
}

const redeem = async (db, user, code) => { ctx.db = db; ctx.user = user; const res = await redeemRoute(post("/api/gift/redeem", { code })); return { status: res.status, body: await res.json() }; };
const codeFor = session => giftLib.formatGiftCode(gifts.giftCodeFor(session.id));
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");

/** A buyer, a paid Pro gift, its code and the row. */
async function giftReady(db, type = "gift_pro") {
  db.profile("buyer", "free", 0);
  const { created } = await buyGift(db, type);
  const p = paid(db, created);
  assert.equal((await p.deliver()).status, 200);
  return { ...p, code: codeFor(p.session), row: () => db.gifts.find(g => g.stripe_session_id === p.session.id) };
}

// ---------- Checkout ----------
test("Checkout pins gift metadata at the regular price, even inside the Black Friday window", async () => {
  for (const ms of [SALE_START, SALE_START + 86_400_000, SALE_END - 1, SALE_END + 1]) {
    for (const [type, cents, credits, tier] of [["gift_plus", 499, 3, "plus"], ["gift_pro", 1499, 10, "pro"]]) {
      const db = database();
      // A Pro buyer can still give Pro: the gift is for someone else.
      db.profile("buyer", "pro", 4);
      const { res, created } = await buyGift(db, type, undefined, ms);
      assert.equal(res.status, 200);
      assert.equal(created.line_items[0].price_data.unit_amount, cents, `${type} at ${new Date(ms).toISOString()}`);
      assert.equal(created.line_items[0].quantity, 1);
      for (const md of [created.metadata, created.payment_intent_data.metadata, created.invoice_creation.invoice_data.metadata]) {
        assert.deepEqual([md.user_id, md.purchase, md.credit_amount, md.gift_plan, md.sale], ["buyer", type, String(credits), tier, undefined]);
      }
      // Who it's for and the note ride on the session only (the webhook reads it), cleaned and lowercased.
      assert.deepEqual([created.metadata.gift_to, created.metadata.gift_from, created.metadata.gift_message], ["friend@example.com", "Maya", "Can't wait to see <your> room."]);
      for (const md of [created.payment_intent_data.metadata, created.invoice_creation.invoice_data.metadata]) assert.equal(md.gift_to ?? md.gift_message ?? md.gift_from, undefined);
      assert.match(created.line_items[0].price_data.product_data.description, new RegExp(`^A gift for friend@example.com: ${credits} plan credits`));
      assert.doesNotMatch(JSON.stringify(created), /Black Friday|bf2026/);
      assert.equal(created.success_url, `https://dormscape.test/gift?sent=${tier}`);
      assert.equal(created.cancel_url, "https://dormscape.test/gift?checkout=cancelled");
      // Discount codes follow the same rule as every other purchase: off in the sale window, on outside it.
      assert.equal(created.allow_promotion_codes, !(ms >= SALE_START && ms < SALE_END));
      // The buyer's own plan is untouched by starting a checkout.
      assert.deepEqual([db.profiles.get("buyer").plan, db.profiles.get("buyer").plan_credits_remaining], ["pro", 4]);
    }
  }
  assert.deepEqual([plan.PLUS_PRICE_CENTS, plan.PLUS_INITIAL_CREDITS, plan.PRO_PRICE_CENTS, plan.PRO_INITIAL_CREDITS], [499, 3, 1499, 10]);
});

test("Checkout validates every gift field on the server and refuses gifts until the table exists", async () => {
  const bad = [
    [{ to: "" }, /email address the gift/], [{ to: "not-an-email" }, /doesn't look right/], [{ to: "a@b.com, c@d.com" }, /doesn't look right/],
    [{ to: "x@y" }, /doesn't look right/], [{ to: `${"a".repeat(250)}@b.com` }, /doesn't look right/], [{ to: "<a@b.com>" }, /doesn't look right/],
    [{ to: "a@b.com", from: "n".repeat(61) }, /60 characters/], [{ to: "a@b.com", message: "m".repeat(301) }, /300 characters/],
  ];
  for (const [gift, error] of bad) {
    const db = database(); db.profile("buyer");
    const { res, created } = await buyGift(db, "gift_plus", gift);
    assert.equal(res.status, 400, JSON.stringify(gift));
    assert.match((await res.json()).error, error);
    assert.equal(created, null, "No Stripe session for an invalid gift");
  }
  // Control characters and line breaks leave the name; the message keeps its lines but not hidden characters.
  const db = database(); db.profile("buyer");
  const { created } = await buyGift(db, "gift_plus", { to: " A@B.co ", from: " Ma\nya\u0007 ", message: "Hi\r\n\n\n\nthere​" });
  assert.deepEqual([created.metadata.gift_to, created.metadata.gift_from, created.metadata.gift_message], ["a@b.co", "Ma ya", "Hi\n\nthere"]);
  // Exactly at the limits is fine; a blank name and note are left off.
  const limits = database(); limits.profile("buyer");
  assert.equal((await buyGift(limits, "gift_plus", { to: "a@b.co", from: "n".repeat(60), message: "m".repeat(300) })).res.status, 200);
  const plain = await buyGift(limits, "gift_plus", { to: "a@b.co", from: "  ", message: "" });
  assert.equal("gift_from" in plain.created.metadata || "gift_message" in plain.created.metadata, false);
  // Signed out, or before the migration: nothing is charged.
  ctx.user = null;
  assert.equal((await checkout(post("/api/checkout", { type: "gift_pro", gift: { to: "a@b.co" } }))).status, 401);
  const before = database({ giftTable: false }); before.profile("buyer");
  const missing = await buyGift(before, "gift_pro");
  assert.equal(missing.res.status, 503);
  assert.match((await missing.res.json()).error, /aren't available yet/);
  assert.equal(missing.created, null);
});

// ---------- Webhook: one code, emailed to the recipient ----------
test("A paid gift makes exactly one code, emails the recipient (not the buyer), and gives the buyer nothing", async () => {
  sends.length = 0; afterTasks.length = 0;
  const db = database();
  db.profile("buyer", "flex", 2);
  const { created } = await buyGift(db, "gift_pro");
  const p = paid(db, created);
  assert.equal((await p.deliver()).status, 200);
  // Stripe redelivers, and an async-payment event can follow: still one gift and one email.
  assert.equal((await (await p.deliver()).json()).duplicate, true);
  assert.equal((await (await p.deliver("checkout.session.async_payment_succeeded")).json()).duplicate, true);
  assert.equal(db.gifts.length, 1);
  const row = db.gifts[0];
  const code = gifts.giftCodeFor(p.session.id);
  assert.match(code, /^[0-9A-HJKMNP-TV-Z]{16}$/);
  assert.notEqual(code, gifts.giftCodeFor("cs_other"), "Each session has its own code");
  assert.deepEqual(
    [row.plan, row.credits, row.buyer_id, row.recipient_email, row.sender_name, row.message, row.payment_intent, row.code_hash, row.code_hint],
    ["pro", 10, "buyer", "friend@example.com", "Maya", "Can't wait to see <your> room.", p.session.payment_intent, sha256(code), code.slice(-4)],
  );
  assert.equal(JSON.stringify(db.gifts).includes(code), false, "The plain code is never stored");
  assert.ok(row.emailed_at);
  assert.ok(db.events.has(p.session.id));
  // The email: to the recipient only, with the code, the escaped note, who it's from, and no expiry.
  assert.equal(sends.length, 1);
  const mail = sends[0];
  assert.deepEqual(mail.body.to, ["friend@example.com"]);
  assert.equal(sends.some(s => s.body.to.includes("buyer@example.test")), false);
  assert.equal(mail.body.subject, "Maya sent you a gift: dormscape Pro");
  const pretty = giftLib.formatGiftCode(code);
  for (const part of [mail.body.html, mail.body.text]) {
    assert.ok(part.includes(pretty));
    assert.ok(part.includes(`https://dormscape.us/gift/redeem#gift=${pretty}`));
    assert.match(part, /No expiry/);
    assert.match(part, /10 plan credits/);
    assert.match(part, /dormscape\.us\/contact/);
  }
  assert.ok(mail.body.html.includes("Can&#39;t wait to see &lt;your&gt; room."));
  assert.equal(mail.body.html.includes("<your>"), false);
  assert.doesNotMatch(mail.body.html + mail.body.text, /unsubscribe|\$\d/i, "Transactional, and no price");
  // The buyer: same plan and credits; only their new Stripe customer is linked, so Billing can list the gift.
  assert.deepEqual([db.profiles.get("buyer").plan, db.profiles.get("buyer").plan_credits_remaining, db.profiles.get("buyer").stripe_customer_id], ["flex", 2, "cus_buyer"]);
  // purchase_completed and gift_purchased go out after the response, once.
  assert.equal(afterTasks.length, 2);
});

test("A gift email that fails is retried with the same code, and nothing is lost", async () => {
  sends.length = 0;
  const db = database(); db.profile("buyer");
  const { created } = await buyGift(db, "gift_plus", { to: "pal@example.org" });
  const p = paid(db, created);
  resendOk = false;
  assert.equal((await p.deliver()).status, 503, "Stripe retries the event");
  resendOk = true;
  assert.equal(db.gifts.length, 1);
  assert.equal(db.gifts[0].emailed_at, null);
  assert.equal((await p.deliver()).status, 200);
  assert.equal(sends.length, 2);
  assert.deepEqual(sends[1].body, sends[0].body, "The retry sends the identical email");
  assert.equal(sends[1].key, sends[0].key, "under the same Resend idempotency key");
  assert.equal(sends[1].body.subject, "Someone sent you a gift: dormscape Plus");
  assert.equal((await p.deliver()).status, 200);
  assert.equal(sends.length, 2, "Sent once it's been accepted");
  // The code from the email redeems.
  db.profile("pal");
  assert.equal((await redeem(db, "pal", codeFor(p.session))).status, 200);
});

test("Gift codes never store their plain text, read the same however they're typed, and change with the secret", () => {
  const code = gifts.giftCodeFor("cs_x");
  assert.equal(giftLib.normalizeGiftCode(giftLib.formatGiftCode(code).toLowerCase().replace(/-/g, " ")), code);
  assert.equal(giftLib.normalizeGiftCode("OIL0-0000-0000-0000"), "0110000000000000");
  assert.equal(giftLib.normalizeGiftCode("ABCD-EFGH-JKMN-PQRU"), null, "U isn't in the alphabet");
  assert.equal(giftLib.normalizeGiftCode("ABCD"), null);
  assert.notEqual(gifts.giftCodeFor("cs_x", "another-secret"), code);
  assert.throws(() => gifts.giftCodeFor("cs_x", ""));
  assert.equal(giftLib.maskEmail("rachel@example.com"), "r***@example.com");
});

// ---------- Redeeming ----------
test("Redeeming grants the plan and credits once; a second redeem fails", async () => {
  const db = database();
  const g = await giftReady(db);
  db.profile("friend", "free", null);
  const first = await redeem(db, "friend", g.code.toLowerCase().replace(/-/g, " "));
  assert.deepEqual([first.status, first.body], [200, { ok: true, plan: "pro", credits: 10 }]);
  const f = db.profiles.get("friend");
  assert.deepEqual([f.plan, f.plan_credits_remaining, f.plus_features_unlocked, f.plan_purchased_at], ["pro", 10, true, null]);
  assert.equal(g.row().redeemed_by, "friend");
  assert.match((await redeem(db, "friend", g.code)).body.error, /already redeemed this gift/);
  db.profile("other");
  const again = await redeem(db, "other", g.code);
  assert.equal(again.status, 409);
  assert.match(again.body.error, /already been redeemed/);
  assert.deepEqual([db.profiles.get("other").plan, db.profiles.get("friend").plan_credits_remaining], ["free", 10]);
  // Bad format, an unknown code, signed out.
  assert.equal((await redeem(db, "other", "nope")).status, 400);
  assert.equal((await redeem(db, "other", giftLib.formatGiftCode(gifts.giftCodeFor("cs_never")))).status, 404);
  assert.equal((await redeem(db, null, g.code)).status, 401);
});

test("A Plus gift adds credits to Pro without downgrading it, and the buyer may redeem their own gift", async () => {
  const db = database();
  const g = await giftReady(db, "gift_plus");
  db.profile("pro-friend", "pro", 4);
  assert.equal((await redeem(db, "pro-friend", g.code)).status, 200);
  assert.deepEqual([db.profiles.get("pro-friend").plan, db.profiles.get("pro-friend").plan_credits_remaining], ["pro", 7]);
  const own = database();
  const mine = await giftReady(own);
  assert.equal((await redeem(own, "buyer", mine.code)).status, 200, "Allowed: the purchase granted nothing, the code does");
  assert.deepEqual([own.profiles.get("buyer").plan, own.profiles.get("buyer").plan_credits_remaining], ["pro", 10]);
});

test("Ten people redeeming one code at once: exactly one gets it", async () => {
  const db = database();
  const g = await giftReady(db);
  const people = Array.from({ length: 10 }, (_, i) => `racer${i}`);
  for (const id of people) db.profile(id);
  const auth = mocks["@/lib/supabase-auth"];
  const signedIn = auth.getUserId;
  const queue = [...people];
  auth.getUserId = async () => queue.shift(); // each request is the next person
  ctx.db = db;
  try {
    const statuses = (await Promise.all(people.map(() => redeemRoute(post("/api/gift/redeem", { code: g.code }))))).map(r => r.status);
    assert.equal(statuses.filter(s => s === 200).length, 1, statuses.join(","));
    assert.equal(statuses.filter(s => s === 409).length, 9);
  } finally {
    auth.getUserId = signedIn;
  }
  const upgraded = people.filter(id => db.profiles.get(id).plan === "pro");
  assert.equal(upgraded.length, 1);
  assert.equal(g.row().redeemed_by, upgraded[0]);
  assert.equal(db.profiles.get(upgraded[0]).plan_credits_remaining, 10);
});

// ---------- Refunds and chargebacks ----------
test("A refund before redeeming voids the code; the voided code then fails", async () => {
  const db = database();
  const g = await giftReady(db);
  const pis = { [g.pi.id]: g.pi };
  assert.equal((await reversal(db, "charge.refunded", { refunded: false, payment_intent: g.pi.id }, pis)).status, 200);
  assert.equal(g.row().voided_at, null, "A partial refund keeps the gift");
  assert.equal((await reversal(db, "charge.refunded", { refunded: true, payment_intent: g.pi.id }, pis)).status, 200);
  assert.ok(g.row().voided_at);
  db.profile("friend");
  const tried = await redeem(db, "friend", g.code);
  assert.equal(tried.status, 410);
  assert.match(tried.body.error, /cancelled/);
  assert.equal(db.profiles.get("friend").plan, "free");
  assert.deepEqual([db.profiles.get("buyer").plan, db.profiles.get("buyer").plan_credits_remaining], ["free", 0], "The buyer had nothing to take back");
  assert.equal((await (await reversal(db, "charge.refunded", { refunded: true, payment_intent: g.pi.id }, pis)).json()).duplicate, true);
});

test("A refund after redeeming takes the gift back from the redeemer, who keeps their other plans", async () => {
  // The redeemer bought Plus themselves (3 credits), then redeemed a Pro gift.
  const db = database();
  const g = await giftReady(db);
  db.profile("friend", "plus", 3, { stripe_customer_id: "cus_friend", plus_features_unlocked: true });
  const ownPlus = { id: "pi_friend_plus", customer: "cus_friend", metadata: { user_id: "friend", purchase: "plus", credit_amount: "3" } };
  // Gifts the redeemer bought for others never count as their plan.
  const theirGift = { id: "pi_friend_gift", customer: "cus_friend", metadata: { user_id: "friend", purchase: "gift_pro", credit_amount: "10" } };
  const charges = { cus_friend: [ownPlus, theirGift].map(pi => ({ status: "succeeded", refunded: false, disputed: false, payment_intent: pi })) };
  assert.equal((await redeem(db, "friend", g.code)).status, 200);
  assert.deepEqual([db.profiles.get("friend").plan, db.profiles.get("friend").plan_credits_remaining], ["pro", 13]);
  assert.equal((await reversal(db, "charge.refunded", { refunded: true, payment_intent: g.pi.id }, { [g.pi.id]: g.pi }, charges)).status, 200);
  const f = db.profiles.get("friend");
  assert.deepEqual([f.plan, f.plan_credits_remaining, f.plus_features_unlocked], ["plus", 3, true]);
  assert.ok(g.row().voided_at);
  assert.deepEqual([db.profiles.get("buyer").plan, db.profiles.get("buyer").plan_credits_remaining], ["free", 0]);

  // Someone whose only plan was the gift drops to Free; a second Pro gift they still hold keeps them on Pro.
  const solo = database();
  const s = await giftReady(solo);
  solo.profile("solo");
  await redeem(solo, "solo", s.code);
  await reversal(solo, "charge.refunded", { refunded: true, payment_intent: s.pi.id }, { [s.pi.id]: s.pi });
  assert.deepEqual([solo.profiles.get("solo").plan, solo.profiles.get("solo").plan_credits_remaining, solo.profiles.get("solo").plus_features_unlocked], ["free", 0, false]);
  const two = database();
  const a = await giftReady(two);
  const { created } = await buyGift(two, "gift_pro");
  const b = paid(two, created); await b.deliver();
  two.profile("lucky");
  await redeem(two, "lucky", a.code);
  await redeem(two, "lucky", codeFor(b.session));
  assert.equal(two.profiles.get("lucky").plan_credits_remaining, 20);
  await reversal(two, "charge.refunded", { refunded: true, payment_intent: a.pi.id }, { [a.pi.id]: a.pi });
  assert.deepEqual([two.profiles.get("lucky").plan, two.profiles.get("lucky").plan_credits_remaining], ["pro", 10]);

  // And a regular refund keeps a plan held through a redeemed gift: a Plus gift, then Pro bought and refunded.
  const mixed = database();
  const m = await giftReady(mixed, "gift_plus");
  mixed.profile("mix");
  await redeem(mixed, "mix", m.code);
  mixed.profiles.get("mix").plan = "pro"; mixed.profiles.get("mix").plan_credits_remaining += 10;
  const proPi = { id: "pi_mix_pro", customer: "cus_mix", metadata: { user_id: "mix", purchase: "pro", credit_amount: "10" } };
  await reversal(mixed, "charge.refunded", { refunded: true, payment_intent: proPi.id }, { [proPi.id]: proPi });
  assert.deepEqual([mixed.profiles.get("mix").plan, mixed.profiles.get("mix").plan_credits_remaining], ["plus", 3]);
});

test("A chargeback takes the gift back and a won dispute restores it, redeemed or not", async () => {
  const db = database();
  const g = await giftReady(db);
  const pis = { [g.pi.id]: g.pi };
  db.profile("friend");
  await redeem(db, "friend", g.code);
  await reversal(db, "charge.dispute.created", { payment_intent: g.pi.id }, pis);
  assert.deepEqual([db.profiles.get("friend").plan, db.profiles.get("friend").plan_credits_remaining], ["free", 0]);
  await reversal(db, "charge.dispute.closed", { status: "lost", payment_intent: g.pi.id }, pis);
  assert.equal(db.profiles.get("friend").plan, "free");
  await reversal(db, "charge.dispute.closed", { status: "won", payment_intent: g.pi.id }, pis);
  assert.deepEqual([db.profiles.get("friend").plan, db.profiles.get("friend").plan_credits_remaining], ["pro", 10]);
  assert.equal(g.row().voided_at, null);
  assert.equal((await (await reversal(db, "charge.dispute.closed", { status: "won", payment_intent: g.pi.id }, pis)).json()).duplicate, true);
  assert.equal(db.profiles.get("friend").plan_credits_remaining, 10, "Given back once");

  // Unredeemed: the dispute voids the code, winning it makes the code work again.
  const fresh = database();
  const u = await giftReady(fresh);
  const upis = { [u.pi.id]: u.pi };
  fresh.profile("later");
  await reversal(fresh, "charge.dispute.created", { payment_intent: u.pi.id }, upis);
  assert.equal((await redeem(fresh, "later", u.code)).status, 410);
  await reversal(fresh, "charge.dispute.closed", { status: "won", payment_intent: u.pi.id }, upis);
  assert.equal((await redeem(fresh, "later", u.code)).status, 200);
  assert.equal(fresh.profiles.get("later").plan, "pro");
  assert.deepEqual([fresh.profiles.get("buyer").plan, fresh.profiles.get("buyer").plan_credits_remaining], ["free", 0]);
});

test("A refund that arrives before the gift exists is retried, not lost", async () => {
  const db = database(); db.profile("buyer");
  const { created } = await buyGift(db, "gift_plus");
  const p = paid(db, created);
  const res = await reversal(db, "charge.refunded", { refunded: true, payment_intent: p.pi.id }, { [p.pi.id]: p.pi });
  assert.equal(res.status, 500, "Stripe sends the refund again later");
  assert.equal(db.events.size, 0, "No reversal recorded yet");
  resendOk = true;
  await p.deliver();
  assert.equal((await reversal(db, "charge.refunded", { refunded: true, payment_intent: p.pi.id }, { [p.pi.id]: p.pi })).status, 200);
  assert.ok(db.gifts[0].voided_at);
});

// ---------- Billing ----------
test("The buyer's billing list shows each gift masked, with where it stands", async () => {
  const db = database();
  const g = await giftReady(db);
  db.profiles.get("buyer").stripe_customer_id = "cus_buyer";
  const charge = (extra = {}) => ({ id: "ch_1", created: 1_764_000_000, amount: 1499, currency: "usd", status: "succeeded", description: null, receipt_url: "https://pay.stripe.com/r", disputed: false, refunded: false, amount_refunded: 0, payment_intent: g.pi, ...extra });
  const list = async (extra) => {
    ctx.db = db; ctx.user = "buyer";
    ctx.stripe = { charges: { list: async () => ({ data: [charge(extra)] }) } };
    return (await (await invoicesRoute(post("/api/account/invoices", {}))).json()).invoices[0];
  };
  assert.deepEqual((await list()).gift, { plan: "Pro", to: "f***@example.com", status: "sent" });
  db.profile("friend");
  await redeem(db, "friend", g.code);
  assert.equal((await list()).gift.status, "redeemed");
  await reversal(db, "charge.refunded", { refunded: true, payment_intent: g.pi.id }, { [g.pi.id]: g.pi });
  const refunded = await list({ refunded: true, amount_refunded: 1499 });
  assert.deepEqual([refunded.gift.status, refunded.reversal, refunded.taken_back], ["refunded", "refunded", null], "Nothing was taken from the buyer");
  const disputed = await list({ disputed: true });
  assert.equal(disputed.gift.status, "voided");
  // A regular purchase has no gift field.
  ctx.stripe = { charges: { list: async () => ({ data: [charge({ payment_intent: { id: "pi_plain", metadata: { purchase: "plus", credit_amount: "3" } } })] }) } };
  assert.equal((await (await invoicesRoute(post("/api/account/invoices", {}))).json()).invoices[0].gift, null);
});

test("The buyer's invoice email is the regular one, worded for a gift", () => {
  const gift = templates.purchaseInvoiceEmail({ tier: "dormscape Pro", credits: 10, invoiceNumber: "DS-1", amount: "$14.99", date: "Nov 25, 2026", url: "https://invoice.stripe.com/i/x", gift: true });
  assert.match(gift.text, /^Thank you for giving dormscape Pro\. The gift includes 10 plan credits/);
  assert.match(gift.html, /when the gift is redeemed/);
  const regular = templates.purchaseInvoiceEmail({ tier: "dormscape Pro", credits: 10, invoiceNumber: "DS-1", amount: "$14.99", date: "Nov 25, 2026", url: "https://invoice.stripe.com/i/x" });
  assert.match(regular.text, /^Thank you for purchasing dormscape Pro\. Your purchase includes 10 plan credits\./);
  assert.match(regular.html, /Your plan and credits are shown in Account &gt; Billing/);
});

// ---------- The migration, in a throwaway local Postgres ----------
test("The migration applies twice, keeps browsers out, and its claim works once", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  await pg.exec("create schema auth; create role anon; create role authenticated; create role service_role; create table auth.users(id uuid primary key);");
  const sql = fs.readFileSync(path.join(root, "docs/migrations/20261125_gift_codes.sql"), "utf8");
  await pg.exec(sql);
  await pg.exec(sql);
  for (const role of ["anon", "authenticated"]) {
    const { rows } = await pg.query("select has_table_privilege($1, 'public.gift_codes', 'select') s, has_table_privilege($1, 'public.gift_codes', 'insert') i, has_table_privilege($1, 'public.gift_codes', 'update') u", [role]);
    assert.deepEqual(rows[0], { s: false, i: false, u: false }, role);
  }
  assert.equal((await pg.query("select relrowsecurity r from pg_class where relname = 'gift_codes'")).rows[0].r, true);
  const user = "00000000-0000-4000-8000-000000000001";
  await pg.query("insert into auth.users values ($1)", [user]);
  const row = (hash, extra = "") => pg.query(`insert into public.gift_codes (code_hash, code_hint, plan, credits, buyer_id, recipient_email, stripe_session_id, payment_intent${extra ? ", message" : ""}) values ($1, 'PQRS', 'pro', 10, $2, 'a@b.co', $3, $4${extra ? ", $5" : ""})`, extra ? [hash, user, `cs_${hash.slice(0, 6)}`, `pi_${hash.slice(0, 6)}`, extra] : [hash, user, `cs_${hash.slice(0, 6)}`, `pi_${hash.slice(0, 6)}`]);
  const h = sha256("ABCDEFGHJKMNPQRS");
  await row(h);
  await assert.rejects(row(sha256("x"), "m".repeat(301)), /check/);
  await assert.rejects(row("not-a-hash"), /check/);
  const claim = () => pg.query("update public.gift_codes set redeemed_by = $2, redeemed_at = now() where code_hash = $1 and redeemed_at is null and voided_at is null returning id", [h, user]);
  assert.equal((await claim()).rows.length, 1);
  assert.equal((await claim()).rows.length, 0, "A second claim finds nothing");
  // A deleted account leaves the gift in place.
  await pg.query("delete from auth.users where id = $1", [user]);
  assert.deepEqual((await pg.query("select buyer_id, redeemed_by, redeemed_at is not null r from public.gift_codes where code_hash = $1", [h])).rows[0], { buyer_id: null, redeemed_by: null, r: true });
  await pg.close();
});
