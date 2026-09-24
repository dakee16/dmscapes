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
  new Function("require", "module", "exports", "console", code)(resolve, module, module.exports, { ...console, error() {} });
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

const responseMock = { NextResponse: { json: (body, options) => Response.json(body, options) } };
function routes(db, { user = "member", stripe = null } = {}) {
  const mocks = {
    "next/server": responseMock,
    "@/lib/supabase-server": { getServiceClient: () => db },
    "@/lib/supabase-auth": { getUserId: async () => user },
    "@/lib/rate-limit": { rateLimit: () => ({ allowed: true }) },
    "@/lib/stripe": { getStripe: () => stripe },
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

test("Checkout advertises and pins the exact new grants, including Pro top-ups", async () => {
  for (const [type, tier, credits, cents] of [["plus", "free", 3, 499], ["pro", "plus", 10, 1499], ["recharge", "plus", 3, 299], ["flex_credits", "pro", 4, 99]]) {
    let created;
    const stripe = { checkout: { sessions: { create: async args => { created = args; return { url: "https://checkout.stripe.com/test" }; } } } };
    const res = await routes(database(tier, 0), { stripe }).checkout(request({ type, quantity: 4 }));
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
  assert.deepEqual(await client.consumePlanCredit(), { blocked: false, remaining: 9 });
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
  const state = { busy: false, errors: [], upgrades: [], paths: [], spends: 0, saves: 0, freeUsed: false };
  const scope = {
    user: { id: "member" }, profile: { plan: "pro", plan_credits_remaining: 10 },
    style: "minimalist", room: { bedSize: "twin-xl" }, budget: 500,
    text: "A cozy room with blue and warm wood", customVibe: "A cozy room", isCustom: true,
    customRegenUsed: false, MIN_LOADING_MS: 0,
    generatingRef: { current: false }, regeneratingRef: { current: false },
    canGeneratePlan: plan.canGeneratePlan, creditLimitReason: plan.creditLimitReason, isPro: plan.isPro,
    validateVibe: () => ({ ok: true }), track() {}, setShowDisclaimer() {}, setValidationMsg() {},
    setGenerationError: e => state.errors.push(e), setApiError: e => state.errors.push(e), setRegenError: e => state.errors.push(e),
    setGenerating: v => { state.busy = v; }, setRegenerating: v => { state.busy = v; },
    openUpgrade: r => state.upgrades.push(r), router: { push: p => state.paths.push(p) },
    consumePlanCredit: async () => { state.spends++; return { blocked: false, remaining: 9 }; },
    refreshProfile: async () => {}, generateVibe: async () => ({ ok: true, products: [{ id: "bed" }] }),
    setCustomResult: () => { state.saves++; }, markCustomRegen: () => { state.freeUsed = true; },
    ...overrides,
  };
  return { state, scope };
}

test("Preset generation handles exhausted credits and network failures without navigation", async () => {
  for (const overrides of [{ profile: { plan: "pro", plan_credits_remaining: 0 } }, { consumePlanCredit: async () => { throw Error("Network unavailable"); } }]) {
    const { state, scope } = controllerScope(overrides);
    await handler("app/plan/style/page.tsx", "runGenerate", scope)();
    assert.deepEqual(state.paths, []);
    assert.equal(state.busy, false);
    assert(state.upgrades.includes("pro-credits") || state.errors.includes("Network unavailable"));
  }
  const { state, scope } = controllerScope();
  await handler("app/plan/style/page.tsx", "runGenerate", scope)();
  assert.equal(state.spends, 1);
  assert.deepEqual(state.paths, ["/plan/result"]);
});

test("Custom-vibe search failure spends nothing; a successful design spends once", async () => {
  const failed = controllerScope({ generateVibe: async () => ({ ok: false, error: "Search unavailable" }) });
  await handler("app/plan/create-vibe/page.tsx", "handleGenerate", failed.scope)();
  assert.equal(failed.state.spends, 0);
  assert.equal(failed.state.busy, false);
  assert.equal(failed.state.saves, 0);
  assert(failed.state.errors.includes("Search unavailable"));
  const success = controllerScope();
  await handler("app/plan/create-vibe/page.tsx", "handleGenerate", success.scope)();
  assert.equal(success.state.spends, 1);
  assert.equal(success.state.saves, 1);
});

test("Custom regeneration keeps one free pass and charges subsequent successful passes", async () => {
  for (const customRegenUsed of [false, true]) {
    const { state, scope } = controllerScope({ customRegenUsed });
    await handler("app/plan/result/page.tsx", "handleRegenerate", scope)();
    assert.equal(state.spends, customRegenUsed ? 1 : 0);
    assert.equal(state.freeUsed, !customRegenUsed);
    assert.equal(state.saves, 1);
    assert.equal(state.busy, false);
  }
  const failed = controllerScope({ customRegenUsed: true, generateVibe: async () => ({ ok: false, error: "Search failed" }) });
  await handler("app/plan/result/page.tsx", "handleRegenerate", failed.scope)();
  assert.equal(failed.state.spends, 0);
  assert.equal(failed.state.saves, 0);
  const blocked = controllerScope({ customRegenUsed: true, consumePlanCredit: async () => ({ blocked: true, remaining: 0 }) });
  await handler("app/plan/result/page.tsx", "handleRegenerate", blocked.scope)();
  assert.equal(blocked.state.saves, 0);
  assert.deepEqual(blocked.state.upgrades, ["pro-credits"]);
});
