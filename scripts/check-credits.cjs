// Run with: node --test scripts/check-credits.cjs
// Exercises production credit helpers and routes with an in-memory database and
// Stripe test double. No live payments, credentials, or database writes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

const plan = load("lib/plan.ts");
const ledger = load("lib/credit-ledger.ts");
function database(tier, balance = null, used = 0) {
  const db = {
    row: { id: "member", plan: tier, plan_credits_remaining: balance, free_plans_used: used },
    events: new Set(), failRead: false, failWrite: false, missing: false, writes: 0,
    from(table) {
      let values, remove = false;
      const filters = [];
      const query = {
        select() { return query; },
        update(v) { values = v; return query; },
        eq(k, v) { filters.push([k, v]); return query; },
        is(k, v) { filters.push([k, v]); return query; },
        delete() { remove = true; return query; },
        async insert(v) {
          assert.equal(table, "processed_stripe_events");
          if (db.events.has(v.event_id)) return { error: { code: "23505" } };
          db.events.add(v.event_id);
          return { error: null };
        },
        async maybeSingle() {
          // Yield so parallel requests read competing snapshots and exercise CAS.
          await Promise.resolve();
          if (table === "processed_stripe_events") { const id = filters.find(([k]) => k === "event_id")?.[1]; return { error: null, data: db.events.has(id) ? { event_id: id } : null }; }
          if (table === "creator_redemptions") return { error: null, data: db.creator ? { user_id: "member" } : null };
          if (db.failRead && !values) return { error: { message: "offline" }, data: null };
          if (db.failWrite && values) return { error: { message: "offline" }, data: null };
          if (db.missing || !filters.every(([k, v]) => (db.row[k] ?? null) === v)) return { error: null, data: null };
          if (values) { Object.assign(db.row, values); db.writes++; }
          return { error: null, data: { ...db.row } };
        },
        then(resolve, reject) {
          if (remove) {
            db.events.delete(filters.find(([k]) => k === "event_id")[1]);
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          return query.maybeSingle().then(resolve, reject);
        },
      };
      return query;
    },
  };
  return db;
}

test("Current offers are 3 Plus, 3 recharge, 10 Pro with unchanged prices", () => {
  assert.deepEqual([plan.PLUS_INITIAL_CREDITS, plan.RECHARGE_CREDITS, plan.PRO_INITIAL_CREDITS], [3, 3, 10]);
  assert.deepEqual([plan.PLUS_PRICE_CENTS, plan.RECHARGE_PRICE_CENTS, plan.PRO_PRICE_CENTS], [499, 299, 1499]);
  // Black Friday: Plus $1.99 and Pro $4.99, each with 2 bonus credits. The shown and charged prices agree.
  assert.deepEqual([plan.PLUS_SALE_PRICE_CENTS, plan.PRO_SALE_PRICE_CENTS, plan.SALE_BONUS_CREDITS], [199, 499, 2]);
  for (const [usd, cents] of [[plan.PLUS_PRICE_USD, plan.PLUS_PRICE_CENTS], [plan.PRO_PRICE_USD, plan.PRO_PRICE_CENTS], [plan.PLUS_SALE_PRICE_USD, plan.PLUS_SALE_PRICE_CENTS], [plan.PRO_SALE_PRICE_USD, plan.PRO_SALE_PRICE_CENTS]]) {
    assert.equal(Math.round(usd * 100), cents);
  }
  // The year-round "was" prices are gone for good.
  assert.equal("PLUS_PRICE_WAS_USD" in plan, false);
  assert.equal("PRO_PRICE_WAS_USD" in plan, false);
});

// The sale window as absolute instants: Thu Nov 26 12:00am ET to Mon Nov 30 11:59pm ET (end excluded).
const SALE_START = Date.parse("2026-11-26T05:00:00Z");
const SALE_END = Date.parse("2026-12-01T05:00:00Z");
/** Runs fn with Date.now() pinned, so checks never depend on today's date. */
async function at(ms, fn) {
  const now = Date.now;
  Date.now = () => ms;
  try { return await fn(); } finally { Date.now = now; }
}

test("The sale window is Thu Nov 26 00:00 to Mon Nov 30 23:59:59.999 Eastern", () => {
  const sale = load("lib/sale.ts");
  assert.equal(Date.parse(sale.SALE.start), SALE_START);
  assert.equal(Date.parse(sale.SALE.end), SALE_END);
  assert.equal(sale.SALE.id, "bf2026");
  for (const [ms, on] of [[SALE_START - 1, false], [SALE_START, true], [SALE_END - 1, true], [SALE_END, false]]) {
    assert.equal(sale.isSale(ms), on, new Date(ms).toISOString());
  }
  assert.deepEqual(sale.salePlan("plus", SALE_START), { cents: 199, credits: 5, sale: true });
  assert.deepEqual(sale.salePlan("pro", SALE_END - 1), { cents: 499, credits: 12, sale: true });
  assert.deepEqual(sale.salePlan("plus", SALE_START - 1), { cents: 499, credits: 3, sale: false });
  assert.deepEqual(sale.salePlan("pro", SALE_END), { cents: 1499, credits: 10, sale: false });
});

test("Pro shows a finite balance and keeps tools at zero; unknown accounts cannot generate", () => {
  const pro = { plan: "pro", plan_credits_remaining: 0 };
  assert.equal(plan.canGeneratePlan(pro), false);
  assert.equal(plan.headerCreditState(pro).designsLeft, 0);
  assert.equal(plan.creditLimitReason(pro), "pro-credits");
  assert.equal(plan.canUse3D(pro), true);
  assert.equal(plan.canBuild3D(pro), true);
  assert.equal(plan.canSaveDesign(pro), true);
  assert.equal(plan.canBuyFlexCredits(pro), true);
  assert.equal(plan.canGeneratePlan(null), false);
  assert.equal(plan.planCreditsRemaining({ plan: "pro", plan_credits_remaining: null }), 10);
  assert.equal(plan.planCreditsRemaining({ plan: "plus", plan_credits_remaining: 7 }), 7);
});

test("Each tier stops at its actual balance without going negative", async () => {
  for (const [tier, balance, expected] of [["free", null, 1], ["flex", 2, 2], ["plus", 3, 3], ["pro", 10, 10], ["pro", 2, 2]]) {
    const db = database(tier, balance);
    for (let n = expected; n > 0; n--) assert.deepEqual(await ledger.spendPlanCredit(db, "member"), { blocked: false, remaining: n - 1 });
    assert.deepEqual(await ledger.spendPlanCredit(db, "member"), { blocked: true, remaining: 0 });
    assert.equal(db.writes, expected);
  }
});

test("Legacy Pro receives ten once, with no reset when depleted", async () => {
  const db = database("pro");
  for (let n = 9; n >= 0; n--) assert.equal((await ledger.spendPlanCredit(db, "member")).remaining, n);
  assert.equal(db.row.plan_credits_remaining, 0);
  assert.equal((await ledger.spendPlanCredit(db, "member")).blocked, true);
});

test("Thirty concurrent Pro generation requests can spend only ten credits", async () => {
  const db = database("pro");
  const results = await Promise.all(Array.from({ length: 30 }, () => ledger.spendPlanCredit(db, "member")));
  assert.equal(results.filter(r => !r.blocked).length, 10);
  assert.equal(results.filter(r => r.blocked).length, 20);
  assert.equal(db.row.plan_credits_remaining, 0);
});

test("Concurrent spending and recharge cannot overwrite each other", async () => {
  const db = database("plus", 3);
  await Promise.all([ledger.spendPlanCredit(db, "member"), ledger.addPlanCredits(db, "member", 3, true)]);
  assert.equal(db.row.plan_credits_remaining, 5);
  assert.equal(db.row.plan, "plus");
});

test("Top-ups preserve paid tiers and balances; Free becomes Flex", async () => {
  for (const tier of ["free", "flex", "plus", "pro"]) {
    const db = database(tier, 2);
    await ledger.addPlanCredits(db, "member", 3);
    assert.equal(db.row.plan_credits_remaining, 5);
    assert.equal(db.row.plan, tier === "free" ? "flex" : tier);
  }
  const legacy = database("pro");
  await ledger.addPlanCredits(legacy, "member", 2);
  assert.equal(legacy.row.plan_credits_remaining, 12);
  await assert.rejects(ledger.addPlanCredits(database("free"), "member", 3, true));
  await assert.rejects(ledger.addPlanCredits(legacy, "member", -1));
});

test("Paid upgrades add the allowance to existing credits and never downgrade Pro", async () => {
  const db = database("plus", 2);
  await ledger.grantPurchasedPlan(db, "member", "pro", 10, "cus_test");
  assert.equal(db.row.plan_credits_remaining, 12);
  assert.equal(db.row.plus_features_unlocked, true);
  assert.equal(db.row.stripe_customer_id, "cus_test");
  await ledger.grantPurchasedPlan(db, "member", "plus", 3, "cus_test");
  assert.equal(db.row.plan, "pro");
  assert.equal(db.row.plan_credits_remaining, 15);
});

// after(): queued here so a test can run it once the response is back, as Next does.
const afterTasks = [];
const responseMock = { NextResponse: { json: (body, options) => Response.json(body, options) }, after: fn => afterTasks.push(fn) };
function routes(db, { user = "member", stripe = null, season } = {}) {
  const mocks = {
    "next/server": responseMock,
    "@/lib/supabase-server": { getServiceClient: () => db },
    "@/lib/supabase-auth": { getUserId: async () => user },
    "@/lib/rate-limit": { rateLimit: () => ({ allowed: true }) },
    "@/lib/stripe": { getStripe: () => stripe },
    // The Halloween window, pinned open or closed so the check doesn't depend on today's date.
    ...(season === undefined ? {} : { "@/lib/season": { isSeason: () => season } }),
  };
  return { consume: load("app/api/plan/consume/route.ts", mocks).POST,
    checkout: load("app/api/checkout/route.ts", mocks).POST,
    webhook: load("app/api/stripe/webhook/route.ts", mocks).POST };
}
const request = (body = {}) => new Request("https://dormscape.test/api", { method: "POST", body: JSON.stringify(body) });

test("Consume API rejects unauthenticated, missing-profile, and unavailable-database requests", async () => {
  assert.equal((await routes(null, { user: null }).consume(request())).status, 401);
  assert.equal((await routes(null).consume(request())).status, 503);
  const missing = database("pro"); missing.missing = true;
  assert.equal((await routes(missing).consume(request())).status, 503);
  const offline = database("pro", 10); offline.failWrite = true;
  assert.equal((await routes(offline).consume(request())).status, 503);
  assert.equal(offline.row.plan_credits_remaining, 10);
  const empty = await routes(database("pro", 0)).consume(request());
  assert.deepEqual(await empty.json(), { blocked: true, remaining: 0 });
});

test("A Spooky Season plan is free only inside the window; every other plan still spends", async () => {
  // A free account whose one free plan is already used: no credits left, still gets a Spooky plan.
  const open = database("free", 0, 1);
  const free = await routes(open, { season: true }).consume(request({ style: "spooky" }));
  assert.deepEqual(await free.json(), { blocked: false, remaining: 0, seasonalFree: true });
  assert.equal(open.row.free_plans_used, 1, "A free seasonal plan writes nothing");
  assert.equal(open.writes, 0);
  const paid = database("pro", 10);
  assert.deepEqual(await (await routes(paid, { season: true }).consume(request({ style: "spooky" }))).json(), { blocked: false, remaining: 10, seasonalFree: true });
  assert.equal(paid.row.plan_credits_remaining, 10);
  // Another vibe in season, or Spooky once the window has closed, goes through the normal ledger.
  assert.deepEqual(await (await routes(paid, { season: true }).consume(request({ style: "cozy" }))).json(), { blocked: false, remaining: 9 });
  assert.deepEqual(await (await routes(paid, { season: false }).consume(request({ style: "spooky" }))).json(), { blocked: false, remaining: 8 });
  assert.deepEqual(await (await routes(database("pro", 0), { season: false }).consume(request({ style: "spooky" }))).json(), { blocked: true, remaining: 0 });
  // A request without a body (older clients) still spends.
  const legacy = database("pro", 2);
  const bare = new Request("https://dormscape.test/api", { method: "POST" });
  assert.deepEqual(await (await routes(legacy, { season: true }).consume(bare)).json(), { blocked: false, remaining: 1 });
});

test("Checkout advertises and pins the exact new grants, including Pro top-ups", async () => {
  for (const [type, tier, credits, cents] of [["plus", "free", 3, 499], ["pro", "plus", 10, 1499], ["recharge", "plus", 3, 299], ["flex_credits", "pro", 4, 99]]) {
    let created;
    const stripe = { checkout: { sessions: { create: async args => { created = args; return { url: "https://checkout.stripe.com/test" }; } } } };
    // Outside the Black Friday window (the sale checks are further down).
    const res = await at(SALE_END, () => routes(database(tier, 0), { stripe }).checkout(request({ type, quantity: 4 })));
    assert.equal(res.status, 200);
    assert.equal(created.metadata.credit_amount, String(credits));
    assert.equal(created.metadata.credit_plan_version, plan.CREDIT_PLAN_VERSION);
    assert.equal(created.line_items[0].price_data.unit_amount, cents);
    assert.equal(created.line_items[0].quantity, type === "flex_credits" ? 4 : 1);
    assert.match(created.line_items[0].price_data.product_data.description, new RegExp(credits + " (more )?(room-plan |plan )?credits?"));
    assert.doesNotMatch(JSON.stringify(created), /unlimited|5 (plan|save|more)/i);
  }
});

test("Checkout cannot sell upgrades using a missing or unknown profile", async () => {
  const stripe = { checkout: { sessions: { create() { throw Error("Must not charge"); } } } };
  assert.equal((await routes(null, { stripe }).checkout(request({ type: "pro" }))).status, 503);
  assert.equal((await routes(database("pro", 0), { stripe }).checkout(request({ type: "pro" }))).status, 409);
  assert.equal((await routes(database("free"), { stripe }).checkout(request({ type: "recharge" }))).status, 409);
});

test("Checkout keeps checked analytics ids on the session only", async () => {
  let created;
  const stripe = { checkout: { sessions: { create: async args => { created = args; return { url: "https://checkout.stripe.com/test" }; } } } };
  await routes(database("free"), { stripe }).checkout(request({ type: "plus", analytics: { ph: "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", ga: "1234567890.1700000000", gs: "1700000000" } }));
  assert.equal(created.metadata.ph_distinct_id, "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b");
  assert.equal(created.metadata.ga_client_id, "1234567890.1700000000");
  assert.equal(created.metadata.ga_session_id, "1700000000");
  assert.equal(created.invoice_creation.invoice_data.metadata.ph_distinct_id, undefined);
  assert.equal(created.payment_intent_data.metadata.ph_distinct_id, undefined);
  for (const analytics of [{ ph: "<script>" }, { ph: "x".repeat(101) }, { ph: 42 }, null, "ph"]) {
    await routes(database("free"), { stripe }).checkout(request({ type: "plus", analytics }));
    assert.equal(created.metadata.ph_distinct_id, undefined, JSON.stringify(analytics));
    assert.equal(created.metadata.user_id, "member");
  }
});

function webhookFixture(db, session) {
  const stripe = { webhooks: { constructEvent: () => ({ type: "checkout.session.completed", data: { object: session } }) } };
  return () => routes(db, { stripe }).webhook(new Request("https://dormscape.test/api/stripe/webhook", {
    method: "POST", headers: { "stripe-signature": "test-signature" }, body: "test payload",
  }));
}

test("Webhook grants new offers once, including recharge and Pro top-ups", async t => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "test-only";
  t.after(() => { if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret; });
  for (const [purchase, tier, before, grant, after] of [["plus", "free", null, 3, 3], ["pro", "free", null, 10, 10], ["recharge", "plus", 1, 3, 4], ["flex_credits", "pro", 0, 2, 2]]) {
    const db = database(tier, before);
    const call = webhookFixture(db, { id: "cs_test", payment_status: "paid", customer: "cus_test", metadata: { user_id: "member", purchase, credit_amount: String(grant), credit_plan_version: plan.CREDIT_PLAN_VERSION } });
    assert.equal((await call()).status, 200);
    assert.equal(db.row.plan_credits_remaining, after);
    assert.equal((await (await call()).json()).duplicate, true);
    assert.equal(db.row.plan_credits_remaining, after);
    if (tier === "pro") assert.equal(db.row.plan, "pro");
  }
});

test("Refunds and chargebacks take a purchase back once; a won chargeback gives it back", async t => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "test-only";
  t.after(() => { if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret; });
  const pi = (id, purchase, credits) => ({ id, customer: "cus_test", metadata: { user_id: "member", purchase, credit_amount: String(credits) } });
  const send = (db, type, object, pis, charges = []) => routes(db, { stripe: {
    webhooks: { constructEvent: () => ({ type, data: { object } }) },
    paymentIntents: { retrieve: async id => pis[id] },
    charges: { list: async () => ({ data: charges }) },
  } }).webhook(new Request("https://dormscape.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "s" }, body: "x" }));

  // A refunded Pro purchase: its credits go (never below zero) and so does Pro.
  const pro = database("pro", 7); pro.row.plus_features_unlocked = true;
  const proPi = { pi_pro: pi("pi_pro", "pro", 10) };
  assert.equal((await send(pro, "charge.refunded", { refunded: true, payment_intent: "pi_pro" }, proPi)).status, 200);
  assert.deepEqual([pro.row.plan, pro.row.plan_credits_remaining, pro.row.plus_features_unlocked], ["free", 0, false]);
  assert.equal((await (await send(pro, "charge.refunded", { refunded: true, payment_intent: "pi_pro" }, proPi)).json()).duplicate, true);

  // Refunding Plus keeps Pro bought separately; leftover credits stay.
  const both = database("pro", 13);
  const pis = { pi_plus: pi("pi_plus", "plus", 3), pi_pro: pi("pi_pro", "pro", 10) };
  const charges = [{ status: "succeeded", refunded: false, disputed: false, payment_intent: pis.pi_pro }, { status: "succeeded", refunded: true, disputed: false, payment_intent: pis.pi_plus }];
  await send(both, "charge.refunded", { refunded: true, payment_intent: "pi_plus" }, pis, charges);
  assert.deepEqual([both.row.plan, both.row.plan_credits_remaining, both.row.plus_features_unlocked], ["pro", 10, true]);

  // Credits only: the plan stays. A partial refund keeps the purchase.
  const flex = database("flex", 5);
  const flexPi = { pi_flex: pi("pi_flex", "flex_credits", 3) };
  await send(flex, "charge.refunded", { refunded: false, payment_intent: "pi_flex" }, flexPi);
  assert.equal(flex.row.plan_credits_remaining, 5);
  await send(flex, "charge.refunded", { refunded: true, payment_intent: "pi_flex" }, flexPi);
  assert.deepEqual([flex.row.plan, flex.row.plan_credits_remaining], ["flex", 2]);

  // A chargeback takes Plus back; leftover credits keep them on Flex. Lost: nothing more. Won: given back.
  const disputed = database("plus", 5);
  const plusPi = { pi_plus: pi("pi_plus", "plus", 3) };
  await send(disputed, "charge.dispute.created", { payment_intent: "pi_plus" }, plusPi);
  assert.deepEqual([disputed.row.plan, disputed.row.plan_credits_remaining], ["flex", 2]);
  await send(disputed, "charge.dispute.closed", { status: "lost", payment_intent: "pi_plus" }, plusPi);
  assert.equal(disputed.row.plan_credits_remaining, 2);
  await send(disputed, "charge.dispute.closed", { status: "won", payment_intent: "pi_plus" }, plusPi);
  assert.deepEqual([disputed.row.plan, disputed.row.plan_credits_remaining], ["plus", 5]);
  assert.equal((await (await send(disputed, "charge.dispute.closed", { status: "won", payment_intent: "pi_plus" }, plusPi)).json()).duplicate, true);

  // Plus from a creator code survives a refunded Plus purchase; a payment our checkout didn't make is ignored.
  const creator = database("plus", 3); creator.creator = true;
  await send(creator, "charge.refunded", { refunded: true, payment_intent: "pi_plus" }, plusPi);
  assert.deepEqual([creator.row.plan, creator.row.plan_credits_remaining], ["plus", 0]);
  const other = database("pro", 10);
  await send(other, "charge.refunded", { refunded: true, payment_intent: "pi_x" }, { pi_x: { id: "pi_x", metadata: {} } });
  assert.deepEqual([other.row.plan, other.row.plan_credits_remaining, other.events.size], ["pro", 10, 0]);
});

test("Webhook preserves an in-flight purchase and retries a failed grant", async t => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "test-only";
  t.after(() => { if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret; });
  const db = database("plus", 1);
  const call = webhookFixture(db, { id: "cs_old", payment_status: "paid", metadata: { user_id: "member", purchase: "recharge" } });
  db.failWrite = true;
  assert.equal((await call()).status, 500);
  assert.equal(db.events.size, 0);
  assert.equal(db.row.plan_credits_remaining, 1);
  db.failWrite = false;
  assert.equal((await call()).status, 200);
  assert.equal(db.row.plan_credits_remaining, 6, "Honor the credits sold before the new offer");
  assert.equal((await (await call()).json()).duplicate, true);
});

test("Webhook sends purchase_completed after its response, once, and never fails on it", async t => {
  const keys = ["STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST", "GA4_API_SECRET"];
  const env = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalFetch = global.fetch;
  t.after(() => {
    for (const k of keys) if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k];
    global.fetch = originalFetch;
  });
  process.env.STRIPE_WEBHOOK_SECRET = "test-only";
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  delete process.env.GA4_API_SECRET;
  const sent = [];
  global.fetch = async (url, init) => { sent.push([url, JSON.parse(init.body)]); return new Response(null, { status: 200 }); };
  afterTasks.length = 0; // earlier webhook tests' captures (no distinct id) aren't this test's
  const run = async () => { for (const fn of afterTasks.splice(0)) await fn(); };
  const metadata = { user_id: "member", purchase: "plus", credit_amount: "3", ph_distinct_id: "ph-buyer" };
  const db = database("free");
  const call = webhookFixture(db, { id: "cs_ph", payment_status: "paid", amount_total: 499, currency: "usd", metadata });
  assert.equal((await call()).status, 200);
  assert.equal(sent.length, 0, "Nothing is sent before the response");
  await run();
  assert.deepEqual(sent, [["https://us.i.posthog.com/i/v0/e/", { api_key: "phc_test", event: "purchase_completed", distinct_id: "ph-buyer", properties: { plan: "plus", amount: 4.99, currency: "USD" } }]]);
  assert.equal((await (await call()).json()).duplicate, true);
  await run();
  assert.equal(sent.length, 1, "A duplicate delivery sends nothing");
  // No distinct id (analytics declined) or no key: nothing is sent.
  await webhookFixture(database("free"), { id: "cs_none", payment_status: "paid", amount_total: 499, currency: "usd", metadata: { ...metadata, ph_distinct_id: undefined } })();
  await run();
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  await webhookFixture(database("free"), { id: "cs_nokey", payment_status: "paid", amount_total: 499, currency: "usd", metadata })();
  await run();
  assert.equal(sent.length, 1);
  // PostHog or GA down: the purchase is still granted and the capture resolves quietly.
  // GA4 too, once its secret is set, under the buyer's GA client and session.
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  process.env.GA4_API_SECRET = "mp secret";
  await webhookFixture(database("plus", 1), { id: "cs_ga", payment_status: "paid", amount_total: 299, currency: "usd", metadata: { ...metadata, purchase: "recharge", ga_client_id: "123.456", ga_session_id: "789" } })();
  await run();
  assert.equal(sent.length, 3);
  assert.equal(sent[1][1].properties.plan, "recharge");
  assert.equal(sent[2][0], "https://www.google-analytics.com/mp/collect?measurement_id=G-DSRNH55V8B&api_secret=mp%20secret");
  assert.deepEqual(sent[2][1], { client_id: "123.456", events: [{ name: "purchase_completed", params: { plan: "recharge", value: 2.99, currency: "USD", transaction_id: "cs_ga", session_id: "789", engagement_time_msec: 1 } }] });
  global.fetch = async () => { throw new Error("offline"); };
  const down = database("free");
  assert.equal((await webhookFixture(down, { id: "cs_down", payment_status: "paid", amount_total: 1499, currency: "usd", metadata: { ...metadata, purchase: "pro", credit_amount: "10" } })()).status, 200);
  assert.equal(down.row.plan, "pro");
  await run();
});

test("Client consumption fails closed for missing auth, network errors, and bad responses", async t => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let token = null, calls = 0;
  const client = load("lib/plan-credits.ts", {
    "@/lib/supabase-browser": { getBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } }) },
  });
  global.fetch = async () => { calls++; throw Error("offline"); };
  await assert.rejects(client.consumePlanCredit(), /Sign in/);
  assert.equal(calls, 0);
  token = "test-token";
  await assert.rejects(client.consumePlanCredit(), /connection/);
  global.fetch = async () => Response.json({ error: "Credit checks unavailable" }, { status: 503 });
  await assert.rejects(client.consumePlanCredit(), /unavailable/);
  global.fetch = async () => Response.json({});
  await assert.rejects(client.consumePlanCredit(), /confirm your balance/);
  global.fetch = async () => Response.json({ blocked: false, remaining: -1 });
  await assert.rejects(client.consumePlanCredit());
  global.fetch = async (_url, args) => {
    assert.equal(args.headers.Authorization, "Bearer test-token");
    return Response.json({ blocked: false, remaining: 9 });
  };
  assert.deepEqual(await client.consumePlanCredit(), { blocked: false, remaining: 9, seasonalFree: false });
  // The style travels to the server, and a free seasonal plan comes back flagged.
  global.fetch = async (_url, args) => {
    assert.deepEqual(JSON.parse(args.body), { style: "spooky" });
    return Response.json({ blocked: false, remaining: 0, seasonalFree: true });
  };
  assert.deepEqual(await client.consumePlanCredit("spooky"), { blocked: false, remaining: 0, seasonalFree: true });
});

// Run the actual page handlers with injected state and service boundaries. This
// verifies that a credit rejection cannot navigate or replace a saved result.
function handler(file, name, scope) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert(found, "Production handler exists: " + name);
  const code = ts.transpileModule(found.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + "; return " + name)(...Object.values(scope));
}

function controllerScope(overrides = {}) {
  // planning is the store's plan mode; screen is the page's planning screen, which opens /plan/result once it's ready.
  const state = { busy: false, errors: [], upgrades: [], paths: [], spends: 0, saves: 0, freeUsed: false, planning: {mode:"manual"}, screen: null, excluded: ["bedding"], events: [], styles: [] };
  const scope = {
    user: { id: "member" }, profile: { plan: "pro", plan_credits_remaining: 10 },
    style: "minimalist", room: { bedSize: "twin-xl" }, budget: 500,
    text: "A cozy room with blue and warm wood", customVibe: "A cozy room", isCustom: true,
    customRegenUsed: false, MIN_LOADING_MS: 0,
    generatingRef: { current: false }, regeneratingRef: { current: false },
    canGeneratePlan: plan.canGeneratePlan, creditLimitReason: plan.creditLimitReason, isPro: plan.isPro,
    isSeasonalStyle: id => id === "spooky", seasonOn: () => true,
    validateVibe: () => ({ ok: true }), track: e => state.events.push(e), setShowDisclaimer() {}, setValidationMsg() {},
    setGenerationError: e => state.errors.push(e), setApiError: e => state.errors.push(e), setRegenError: e => state.errors.push(e),
    setGenerating: v => { state.busy = v; }, setRegenerating: v => { state.busy = v; }, setPlanning: v => { state.screen = v; },
    openUpgrade: r => state.upgrades.push(r), router: { push: p => state.paths.push(p) },
    consumePlanCredit: async style => { state.spends++; state.styles.push(style); return { blocked: false, remaining: 9, seasonalFree: false }; },
    refreshProfile: async () => {}, generateVibe: async () => ({ ok: true, products: [{ id: "bed" }] }),
    setCustomResult: () => { state.saves++; }, markCustomRegen: () => { state.freeUsed = true; },
    usePlannerStore: {getState:()=>({updatePlanning:patch=>{state.planning={...state.planning,...patch};}}),setState:patch=>Object.assign(state,patch)},
    ...overrides,
  };
  return { state, scope };
}

test("Preset generation handles exhausted credits and network failures without opening the result", async () => {
  for (const overrides of [{ profile: { plan: "pro", plan_credits_remaining: 0 } }, { consumePlanCredit: async () => { throw Error("Network unavailable"); } }]) {
    const { state, scope } = controllerScope(overrides);
    await handler("app/plan/budget/page.tsx", "runGenerate", scope)();
    assert.deepEqual(state.paths, []);
    assert.equal(state.screen, null);
    assert.equal(state.busy, false);
    assert.equal(state.planning.mode, "manual");
    assert.deepEqual(state.excluded, ["bedding"]);
    assert(state.upgrades.includes("pro-credits") || state.errors.includes("Network unavailable"));
  }
  const { state, scope } = controllerScope();
  await handler("app/plan/budget/page.tsx", "runGenerate", scope)();
  assert.equal(state.spends, 1);
  assert.deepEqual(state.screen, { ready: true });
  assert.equal(state.planning.mode, "generated");
  assert.equal(state.excluded, null);
});

test("A free account with no credits still opens a Spooky Season plan, flagged as seasonal", async () => {
  const { state, scope } = controllerScope({ style: "spooky", budget: 75, profile: { plan: "free", free_plans_used: 1 },
    consumePlanCredit: async style => { state.styles.push(style); return { blocked: false, remaining: 0, seasonalFree: true }; } });
  await handler("app/plan/budget/page.tsx", "runGenerate", scope)();
  assert.deepEqual(state.upgrades, []);
  assert.deepEqual(state.styles, ["spooky"]);
  assert.deepEqual(state.screen, { ready: true });
  assert.equal(state.planning.seasonalFree, true);
  assert(state.events.includes("seasonal_plan_started") && !state.events.includes("plan_credit_consumed"));
  // The same account on any other vibe is stopped at the credit gate.
  const other = controllerScope({ style: "cozy", profile: { plan: "free", free_plans_used: 1 } });
  await handler("app/plan/budget/page.tsx", "runGenerate", other.scope)();
  assert.equal(other.state.spends, 0);
  assert.equal(other.state.upgrades.length, 1);
});

test("Custom-vibe search failure spends nothing; a successful design spends once", async () => {
  const failed = controllerScope({ generateVibe: async () => ({ ok: false, error: "Search unavailable" }) });
  await handler("app/plan/create-vibe/page.tsx", "handleGenerate", failed.scope)();
  assert.equal(failed.state.spends, 0);
  assert.equal(failed.state.busy, false);
  assert.equal(failed.state.saves, 0);
  assert.equal(failed.state.screen, null);
  assert(failed.state.errors.includes("Search unavailable"));
  const success = controllerScope();
  await handler("app/plan/create-vibe/page.tsx", "handleGenerate", success.scope)();
  assert.equal(success.state.spends, 1);
  assert.equal(success.state.saves, 1);
  assert.deepEqual(success.state.screen, { ready: true, vibe: "A cozy room with blue and warm wood" });
});

test("Custom regeneration keeps one free pass and charges subsequent successful passes", async () => {
  for (const customRegenUsed of [false, true]) {
    const { state, scope } = controllerScope({ customRegenUsed });
    await handler("components/planner/PlanResult.tsx", "handleRegenerate", scope)();
    assert.equal(state.spends, customRegenUsed ? 1 : 0);
    assert.equal(state.freeUsed, !customRegenUsed);
    assert.equal(state.saves, 1);
    assert.equal(state.busy, false);
  }
  const failed = controllerScope({ customRegenUsed: true, generateVibe: async () => ({ ok: false, error: "Search failed" }) });
  await handler("components/planner/PlanResult.tsx", "handleRegenerate", failed.scope)();
  assert.equal(failed.state.spends, 0);
  assert.equal(failed.state.saves, 0);
  const blocked = controllerScope({ customRegenUsed: true, consumePlanCredit: async () => ({ blocked: true, remaining: 0 }) });
  await handler("components/planner/PlanResult.tsx", "handleRegenerate", blocked.scope)();
  assert.equal(blocked.state.saves, 0);
  assert.deepEqual(blocked.state.upgrades, ["pro-credits"]);
});

// ---------- Black Friday (lib/sale.ts) ----------
async function checkoutAt(ms, type, tier, quantity) {
  let created;
  const stripe = { checkout: { sessions: { create: async args => { created = args; return { url: "https://checkout.stripe.com/test" }; } } } };
  const res = await at(ms, () => routes(database(tier, 0), { stripe }).checkout(request({ type, quantity })));
  assert.equal(res.status, 200);
  return created;
}
const pinned = c => [c.metadata, c.invoice_creation.invoice_data.metadata, c.payment_intent_data.metadata];

test("Inside the window checkout charges $1.99 Plus with 5 credits and $4.99 Pro with 12, pinned everywhere", async () => {
  for (const ms of [SALE_START, SALE_START + 3 * 86_400_000, SALE_END - 1]) {
    for (const [type, tier, cents, credits] of [["plus", "free", 199, 5], ["pro", "plus", 499, 12], ["pro", "free", 499, 12]]) {
      const c = await checkoutAt(ms, type, tier);
      assert.equal(c.line_items[0].price_data.unit_amount, cents);
      assert.equal(c.line_items[0].quantity, 1);
      for (const md of pinned(c)) assert.deepEqual([md.purchase, md.credit_amount, md.sale], [type, String(credits), "bf2026"]);
      assert.match(c.line_items[0].price_data.product_data.description, new RegExp(`^One-time upgrade: ${credits} plan credits, including 2 Black Friday bonus credits, free saving`));
    }
    // Flex credits and the Plus recharge are not on sale.
    const recharge = await checkoutAt(ms, "recharge", "plus");
    assert.deepEqual([recharge.line_items[0].price_data.unit_amount, recharge.metadata.credit_amount, recharge.metadata.sale], [299, "3", undefined]);
    const flex = await checkoutAt(ms, "flex_credits", "pro", 4);
    assert.deepEqual([flex.line_items[0].price_data.unit_amount, flex.line_items[0].quantity, flex.metadata.credit_amount, flex.metadata.sale], [99, 4, "4", undefined]);
  }
});

test("1 ms before the start, at the end and after it, checkout is exactly the regular offer", async () => {
  const copy = {
    plus: "One-time upgrade: 3 plan credits, free saving, all 9 vibes, and PDF/PNG export, comparison, and priority school requests unlocked for good.",
    pro: "One-time upgrade: 10 plan credits, free saving, 3D Room Builder, live 3D planning, custom vibes, and all Plus tools. Top up credits separately.",
  };
  for (const ms of [SALE_START - 1, SALE_END, SALE_END + 86_400_000]) {
    for (const [type, tier, cents, credits] of [["plus", "free", 499, 3], ["pro", "plus", 1499, 10]]) {
      const c = await checkoutAt(ms, type, tier);
      assert.equal(c.line_items[0].price_data.unit_amount, cents);
      assert.equal(c.line_items[0].price_data.product_data.description, copy[type]);
      for (const md of pinned(c)) assert.deepEqual([md.credit_amount, md.sale], [String(credits), undefined]);
      assert.doesNotMatch(JSON.stringify(c), /bf2026|Black Friday/);
    }
  }
});

test("Kill switch: NEXT_PUBLIC_SALE=off charges regular prices inside the window", async t => {
  const prev = process.env.NEXT_PUBLIC_SALE;
  t.after(() => { if (prev === undefined) delete process.env.NEXT_PUBLIC_SALE; else process.env.NEXT_PUBLIC_SALE = prev; });
  process.env.NEXT_PUBLIC_SALE = "off";
  for (const [type, tier, cents, credits] of [["plus", "free", 499, 3], ["pro", "plus", 1499, 10]]) {
    const c = await checkoutAt(SALE_START + 60_000, type, tier);
    assert.deepEqual([c.line_items[0].price_data.unit_amount, c.metadata.credit_amount, c.metadata.sale], [cents, String(credits), undefined]);
  }
  const sale = load("lib/sale.ts");
  assert.equal(sale.SALE_ENABLED, false);
  assert.equal(sale.isSale(SALE_START + 60_000), false);
  delete process.env.NEXT_PUBLIC_SALE;
  assert.equal((await checkoutAt(SALE_START + 60_000, "plus", "free")).line_items[0].price_data.unit_amount, 199);
});

test("A Black Friday purchase grants 5 or 12 credits once, even if paid after the window, and a refund takes the same back", async t => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "test-only";
  t.after(() => { if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret; });
  for (const [type, credits] of [["plus", 5], ["pro", 12]]) {
    // Checkout opened at 11:59pm Monday; Stripe confirms the payment after midnight.
    const c = await checkoutAt(SALE_END - 60_000, type, "flex");
    const db = database("flex", 2);
    const session = { id: `cs_bf_${type}`, payment_status: "paid", customer: "cus_test", amount_total: c.line_items[0].price_data.unit_amount, currency: "usd", metadata: c.metadata };
    const paid = () => at(SALE_END + 60_000, webhookFixture(db, session));
    assert.equal((await paid()).status, 200);
    assert.deepEqual([db.row.plan, db.row.plan_credits_remaining], [type, 2 + credits]);
    assert.equal((await (await paid()).json()).duplicate, true);
    assert.equal(db.row.plan_credits_remaining, 2 + credits);
    // Refunded: exactly the sale grant comes off, the 2 credits bought before stay (on Flex).
    const pi = { id: "pi_bf", customer: "cus_test", metadata: c.payment_intent_data.metadata };
    const refund = await routes(db, { stripe: {
      webhooks: { constructEvent: () => ({ type: "charge.refunded", data: { object: { refunded: true, payment_intent: "pi_bf" } } }) },
      paymentIntents: { retrieve: async () => pi },
      charges: { list: async () => ({ data: [] }) },
    } }).webhook(new Request("https://dormscape.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "s" }, body: "x" }));
    assert.equal(refund.status, 200);
    assert.deepEqual([db.row.plan, db.row.plan_credits_remaining, db.row.plus_features_unlocked], ["flex", 2, false]);
  }
});

test("checkout_started and purchase_completed carry sale: bf2026 for sale purchases only", async t => {
  const keys = ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST", "GA4_API_SECRET"];
  const env = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalFetch = global.fetch;
  t.after(() => {
    for (const k of keys) if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k];
    global.fetch = originalFetch;
  });
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  process.env.GA4_API_SECRET = "mp";
  const { capturePurchase } = load("lib/purchase-analytics.ts");
  const sent = [];
  const send = async (_url, init) => { sent.push(JSON.parse(init.body)); return new Response(null, { status: 200 }); };
  const ids = { ph_distinct_id: "ph-buyer", ga_client_id: "123.456" };
  await capturePurchase({ id: "cs_bf", amount_total: 199, currency: "usd", metadata: { ...ids, sale: "bf2026" } }, "plus", send);
  assert.deepEqual(sent[0].properties, { plan: "plus", amount: 1.99, currency: "USD", sale: "bf2026" });
  assert.equal(sent[1].events[0].params.sale, "bf2026");
  sent.length = 0;
  await capturePurchase({ id: "cs_regular", amount_total: 499, currency: "usd", metadata: ids }, "plus", send);
  assert.deepEqual(sent[0].properties, { plan: "plus", amount: 4.99, currency: "USD" });
  assert.equal("sale" in sent[1].events[0].params, false);

  // In the browser, tagged by the clock (as the server prices it), never by the ?sale= preview.
  const events = [];
  const client = load("lib/checkout.ts", {
    "@/lib/supabase-browser": { getBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) } }) },
    "@/lib/analytics": { track: (event, props) => events.push([event, props]), checkoutAnalyticsIds: () => ({}) },
  });
  global.fetch = async () => Response.json({ error: "owned", alreadyOwned: true }, { status: 409 });
  await at(SALE_START + 1, () => client.startCheckout("pro"));
  await at(SALE_START + 1, () => client.startCheckout("flex_credits", 3));
  await at(SALE_END, () => client.startCheckout("plus"));
  assert.deepEqual(events, [
    ["checkout_started", { type: "pro", sale: "bf2026" }],
    ["checkout_started", { type: "flex_credits", quantity: 3 }],
    ["checkout_started", { type: "plus" }],
  ]);
});

test("The head script marks <html data-sale> only inside the window; ?sale= previews for the tab; a closed banner stays closed", () => {
  const { SALE_SCRIPT } = load("lib/sale.ts");
  const store = o => ({ getItem: k => o[k] ?? null, setItem: (k, v) => { o[k] = String(v); } });
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  const run = (ms, search = "", session = store({}), local = store({})) => {
    const attrs = {};
    new Function("Date", "document", "location", "sessionStorage", "localStorage", SALE_SCRIPT)(
      { now: () => ms }, { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } }, { search }, session, local);
    return attrs;
  };
  const on = { "data-sale": "bf2026" };
  assert.deepEqual(run(SALE_START - 1), {});
  assert.deepEqual(run(SALE_START), on);
  assert.deepEqual(run(SALE_END - 1), on);
  assert.deepEqual(run(SALE_END), {});
  const tab = store({});
  assert.deepEqual(run(SALE_START - 1, "?sale=on", tab), on);
  assert.deepEqual(run(SALE_END + 1, "", tab), on, "the preview lasts the tab session");
  assert.deepEqual(run(SALE_START + 1, "?ref=x&sale=off", tab), {});
  assert.deepEqual(run(SALE_START - 1, "?sale=onward", store({})), {}, "only exact values count");
  assert.deepEqual(run(SALE_START + 1, "", store({}), store({ "dormscape-sale-banner": "bf2026" })), { ...on, "data-sale-banner": "off" });
  assert.deepEqual(run(SALE_START + 1, "?sale=off", blocked, blocked), on, "storage blocked: the clock decides");
});

test("Discount codes are off inside the sale window for every purchase, and on outside it or with the kill switch", async t => {
  const types = [["plus", "free"], ["pro", "plus"], ["recharge", "plus"], ["flex_credits", "pro", 2]];
  for (const [type, tier, quantity] of types) {
    for (const ms of [SALE_START, SALE_END - 1]) assert.equal((await checkoutAt(ms, type, tier, quantity)).allow_promotion_codes, false, `${type} in the window`);
    for (const ms of [SALE_START - 1, SALE_END]) assert.equal((await checkoutAt(ms, type, tier, quantity)).allow_promotion_codes, true, `${type} outside the window`);
  }
  const prev = process.env.NEXT_PUBLIC_SALE;
  t.after(() => { if (prev === undefined) delete process.env.NEXT_PUBLIC_SALE; else process.env.NEXT_PUBLIC_SALE = prev; });
  process.env.NEXT_PUBLIC_SALE = "off";
  for (const [type, tier, quantity] of types) assert.equal((await checkoutAt(SALE_START + 60_000, type, tier, quantity)).allow_promotion_codes, true, `${type} with the kill switch`);
});
