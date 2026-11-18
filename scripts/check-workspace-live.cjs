// My Room live collaboration, in a real browser with no Supabase and no production data.
// Three pages in one browser profile sign in as stub members (owner, editor, commenter) with the
// dev-only auth stub; /api/workspaces/<id> is mocked here with a fixture room, and cursors, presence
// and pings travel through the dev-only fake relay (lib/fake-realtime.ts) instead of Supabase Realtime.
//
// Needs a dev server with the relay on:   NEXT_PUBLIC_FAKE_REALTIME=1 npx next dev -p 3207
// Run:  NODE_PATH=<dir with playwright> node scripts/check-workspace-live.cjs [--only=lag,gestures] [--label=after]
// Screenshots and a results JSON go to qa-tmp/live/ (gitignored).
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require("playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3207", OUT = path.join(__dirname, "../qa-tmp/live");
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split("=")));
const only = args.only ? new Set(args.only.split(",")) : null, label = args.label ?? "run";
const ROOM = "44444444-4444-4444-8444-444444444444", EPOCH = "55555555-5555-4555-8555-555555555555";
const OWNER = { id: "11111111-1111-4111-8111-111111111111", name: "Alex", role: "owner" };
const EDITOR = { id: "22222222-2222-4222-8222-222222222222", name: "Sam", role: "editor" };
const COMMENTER = { id: "33333333-3333-4333-8333-333333333333", name: "Riley", role: "commenter" };
const FOURTH = { id: "66666666-6666-4666-8666-666666666666", name: "Jo", role: "editor" };
const template = require("../templates/compact-square-double-12x11-v1.json");
const snapshot = { name: "Live test room", college_id: null, dorm_id: null, room_dimensions: { length_ft: 12, width_ft: 11, room_type: "double", occupants: 2, bed_size: "twin_xl" },
  style: "minimalist", budget: 500, template_id: template.template_id, furniture_positions: template.furniture, selected_products: {} };
const now = new Date().toISOString();
const state = { revision: 1, members: [OWNER, EDITOR, COMMENTER], comments: [
  { id: "c0000000-0000-4000-8000-000000000001", user_id: EDITOR.id, display_name: EDITOR.name, body: "Desk by the window?", target: "furniture:desk-a", resolved: false, created_at: now, parent_id: null },
], patches: [] };
const detail = who => ({ workspace: { id: ROOM, owner_id: OWNER.id, name: snapshot.name, snapshot, revision: state.revision, shared: true, source_room_id: null, created_at: now, updated_at: now, realtime_epoch: EPOCH },
  role: who.role, ownerPro: true, canEdit: who.role !== "commenter", members: state.members.map(m => ({ user_id: m.id, role: m.role, display_name: m.name })),
  comments: state.comments, versions: [], invitations: [] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { label, at: now };
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; console.log("  ok", message); };

async function open(context, who, query = "") {
  const page = await context.newPage();
  page.on("pageerror", e => console.log(`  [${who.name} page error]`, e.message));
  await page.addInitScript(([id, name]) => {
    sessionStorage.setItem("dormscape-dev-auth", JSON.stringify({ id, email: `${name.toLowerCase()}@example.test`, username: name, plan: "pro" }));
  }, [who.id, who.name]);
  await page.route(/\/api\/workspaces\//, async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.endsWith("/voice")) return route.fulfill({ json: { available: false } });
    if (req.method() === "GET") return route.fulfill({ json: detail(who) });
    const body = req.postDataJSON() ?? {};
    state.patches.push({ who: who.name, ...body });
    if (body.action === "save") { state.revision++; return route.fulfill({ json: { ok: true, revision: state.revision } }); }
    if (body.action === "comment") {
      const parent = body.parent_id && state.comments.find(c => c.id === body.parent_id);
      const c = { id: `c0000000-0000-4000-8000-${String(state.comments.length + 1).padStart(12, "0")}`, user_id: who.id, display_name: who.name, body: body.body, target: parent ? parent.target : body.target, resolved: false, created_at: new Date().toISOString(), parent_id: body.parent_id ?? null };
      state.comments = [...state.comments, c];
      return route.fulfill({ json: { ok: true, id: c.id } });
    }
    if (body.action === "resolve") { state.comments = state.comments.map(c => c.id === body.comment_id ? { ...c, resolved: body.resolved } : c); return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto(`${BASE}/rooms/${ROOM}${query}`);
  await page.getByRole("region", { name: "Interactive room floor plan" }).waitFor({ timeout: 60_000 });
  return page;
}
/** Wait until `page` sees `who` present and active (their Follow button shows in the rail). */
async function sees(page, who) {
  await page.locator("aside[aria-label='Room filters and people'] li", { hasText: who.name }).getByRole("button", { name: /Follow/ }).waitFor({ timeout: 30_000 });
}
const surface = page => page.getByRole("region", { name: "Interactive room floor plan" });

const percentile = (values, p) => { const v = [...values].sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * p))] : NaN; };
/** Move the sender's mouse across the plan at a steady speed and time where the receiver draws it.
 * The two pages can lay the plan out at different sizes, so sender and receiver pixels are matched
 * through the two resting positions (the projection is linear at the default zoom). */
async function measureLag(sender, receiver, senderId, { ms = 2500 } = {}) {
  // Across the middle of the fixture room (inside its walls, clear of the comment pin).
  const box = await surface(sender).boundingBox(), y = box.y + box.height * 0.6, x0 = box.x + box.width * 0.3, x1 = box.x + box.width * 0.68;
  await sender.evaluate(() => { window.__moves = []; addEventListener("pointermove", e => { const r = document.querySelector("[aria-label='Interactive room floor plan']").getBoundingClientRect(); window.__moves.push([Date.now(), e.clientX - r.left]); }, { capture: true }); });
  await receiver.evaluate(id => {
    window.__drawn = [];
    // Read after the frame's animation callbacks have all run, so their order can't skew a frame.
    const read = () => { const el = document.querySelector(`[data-cursor="${id}"]`), r = document.querySelector("[aria-label='Interactive room floor plan']").getBoundingClientRect();
      if (el) window.__drawn.push([Date.now(), el.getBoundingClientRect().left - r.left]); };
    const tick = () => { setTimeout(read); window.__raf = requestAnimationFrame(tick); };
    tick();
  }, senderId);
  await sender.mouse.move(x0, y); await sleep(900);
  const t0 = Date.now();
  for (;;) { const t = Date.now() - t0; if (t > ms) break; await sender.mouse.move(x0 + (x1 - x0) * t / ms, y); }
  await sender.mouse.move(x1, y); await sleep(1200);
  const moves = await sender.evaluate(() => window.__moves), drawn = await receiver.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__drawn; });
  assert.ok(drawn.length > 30, "The receiver drew the remote cursor");
  const S0 = moves.filter(m => m[0] < t0).at(-1)[1], S1 = moves.at(-1)[1], R0 = drawn.filter(d => d[0] < t0).at(-1)[1], R1 = drawn.at(-1)[1];
  const toSender = r => S0 + (r - R0) * (S1 - S0) / (R1 - R0), moving = moves.filter(m => m[0] >= t0);
  const lags = [], deltas = [];
  for (let i = 0; i < drawn.length; i++) {
    const [t, raw] = drawn[i], x = toSender(raw);
    if (t > t0 + 100 && t < t0 + ms && i && t - drawn[i - 1][0] < 40) deltas.push(raw - drawn[i - 1][1]);
    if (x <= S0 + 4 || x >= S1 - 4) continue;
    const j = moving.findIndex((m, k) => k + 1 < moving.length && m[1] <= x && moving[k + 1][1] >= x);
    if (j < 0) continue;
    const [ta, xa] = moving[j], [tb, xb] = moving[j + 1];
    lags.push(t - (xb === xa ? ta : ta + (tb - ta) * (x - xa) / (xb - xa)));
  }
  return { p50: Math.round(percentile(lags, 0.5)), p95: Math.round(percentile(lags, 0.95)), samples: lags.length,
    senderMovesPerSecond: Math.round(moving.length / (ms / 1000)), framesWhileMoving: deltas.length, stalledFrames: deltas.filter(d => Math.abs(d) < 0.01).length,
    // How unevenly the drawn cursor moves frame to frame while the mouse moves steadily (0 = perfectly even).
    unevenness: Math.round((percentile(deltas, 0.95) - percentile(deltas, 0.05)) / percentile(deltas, 0.5) * 100) / 100,
    scale: Math.round((R1 - R0) / (S1 - S0) * 1000) / 1000 };
}

/** Receive-to-drawn delay of the receiver alone: a script on a blank page plays a perfectly steady sender
 * (`rate` messages a second, each held back 0–`jitter` ms like a network would) on `who`'s topic. */
async function measurePipeline(context, receiver, who, { rate = 25, jitter = 0, ms = 2500 } = {}) {
  const synth = await context.newPage();
  await synth.goto(`${BASE}/robots.txt`);
  const topic = `workspace:${ROOM}:${EPOCH}:${who.id}`, x0 = 0.25, x1 = 0.75;
  await receiver.evaluate(id => {
    window.__drawn = [];
    const read = () => { const el = document.querySelector(`[data-cursor="${id}"]`), r = document.querySelector("[aria-label='Interactive room floor plan']").getBoundingClientRect();
      if (el && el.style.visibility !== "hidden") window.__drawn.push([Date.now(), el.getBoundingClientRect().left - r.left]); };
    const tick = () => { setTimeout(read); window.__raf = requestAnimationFrame(tick); };
    tick();
  }, who.id);
  const t0 = await synth.evaluate(async ({ topic, rate, jitter, ms, x0, x1 }) => {
    const bus = new BroadcastChannel("dormscape-fake-realtime");
    const session = await new Promise(resolve => { bus.onmessage = e => { if (e.data.topic === topic && e.data.kind === "presence" && e.data.meta) resolve(e.data.meta.session); }; bus.postMessage({ topic, kind: "hello" }); });
    const start = Date.now() + 700, end = start + ms; let seq = 0;
    const x = t => x0 + (x1 - x0) * Math.min(1, Math.max(0, (t - start) / ms));
    const timer = setInterval(() => { const at = Date.now(), payload = { surface: "plan", x: x(at), y: 0.6, session, at, seq: ++seq };
      setTimeout(() => bus.postMessage({ topic, kind: "broadcast", event: "cursor", payload }), Math.random() * jitter); }, 1000 / rate);
    setTimeout(() => clearInterval(timer), end - Date.now() + 900);
    return start;
  }, { topic, rate, jitter, ms, x0, x1 });
  await sleep(700 + ms + 1300);
  const drawn = await receiver.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__drawn; });
  await synth.close();
  assert.ok(drawn.length > 30, "The receiver drew the steady cursor");
  const R0 = drawn.filter(d => d[0] < t0).at(-1)[1], R1 = drawn.at(-1)[1], lags = [], deltas = [];
  for (let i = 0; i < drawn.length; i++) {
    const [t, raw] = drawn[i], f = (raw - R0) / (R1 - R0);
    if (t > t0 + 150 && t < t0 + ms && i && t - drawn[i - 1][0] < 40) deltas.push(raw - drawn[i - 1][1]);
    if (f > 0.02 && f < 0.98) lags.push(t - (t0 + f * ms));
  }
  return { rate, jitter, p50: Math.round(percentile(lags, 0.5)), p95: Math.round(percentile(lags, 0.95)), samples: lags.length,
    framesWhileMoving: deltas.length, stalledFrames: deltas.filter(d => Math.abs(d) < 0.01).length,
    unevenness: Math.round((percentile(deltas, 0.95) - percentile(deltas, 0.05)) / percentile(deltas, 0.5) * 100) / 100 };
}

const tests = {
  async lag({ owner, editor, context }) {
    await sees(editor, OWNER); await sees(owner, EDITOR);
    const r = await measureLag(owner, editor, OWNER.id);
    console.log("  2D cursor lag (owner -> editor):", JSON.stringify(r));
    results.lag2d = r;
    await owner.mouse.move(5, 5); await sleep(300); // off the canvas, so only the steady sender moves Alex's cursor
    for (const [rate, jitter] of [[args.rate ? Number(args.rate) : 25, 0], [args.rate ? Number(args.rate) : 25, 30]]) {
      const p = await measurePipeline(context, editor, OWNER, { rate, jitter });
      console.log("  receiver pipeline (steady sender):", JSON.stringify(p));
      (results.pipeline ??= []).push(p);
    }
    const stats = await editor.locator("[data-testid=cursor-debug]").textContent().catch(() => null);
    if (stats) { results.debugReadout = stats; console.log("  readout:", stats); }
    if (label === "baseline") return;
    ok(r.p50 <= 120 && r.p95 <= 250, `2D cursor lag p50 ${r.p50} ms ≤ 120 and p95 ${r.p95} ms ≤ 250`);
    ok(results.pipeline.every(p => p.p50 <= 120 && p.p95 <= 250 && p.stalledFrames <= 2), "Steady sender: drawn within budget, without stalls, even with 30 ms network jitter");
  },
  async still({ owner, editor }) {
    const box = await surface(owner).boundingBox(), cursor = editor.locator(`[data-cursor="${OWNER.id}"]`);
    await owner.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.6);
    await owner.mouse.move(box.x + box.width * 0.46, box.y + box.height * 0.6);
    await cursor.waitFor();
    await sleep(12_000);
    ok(await cursor.isVisible(), "A cursor that stops moving is still shown 12 s later (keepalive)");
    await owner.mouse.move(box.x - 150, box.y + 40);
    await cursor.waitFor({ state: "detached", timeout: 1000 });
    ok(true, "Leaving the canvas clears the cursor at once");
  },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const owner = await open(context, OWNER, "?debug=cursors"), editor = await open(context, EDITOR, "?debug=cursors"), commenter = await open(context, COMMENTER);
    const pages = { owner, editor, commenter, context };
    for (const [name, test] of Object.entries(tests)) {
      if (only && !only.has(name)) continue;
      console.log(`- ${name}`);
      await test(pages);
    }
    fs.writeFileSync(path.join(OUT, `results-${label}.json`), JSON.stringify(results, null, 2));
    console.log(`PASS: ${checks} live collaboration checks (${label}).`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
