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
const state = { revision: 1, snapshot, members: [OWNER, EDITOR, COMMENTER, FOURTH], comments: [
  { id: "c0000000-0000-4000-8000-000000000001", user_id: EDITOR.id, display_name: EDITOR.name, body: "Desk by the window?", target: "furniture:desk-a", resolved: false, created_at: now, parent_id: null },
], patches: [] };
const detail = who => ({ workspace: { id: ROOM, owner_id: OWNER.id, name: snapshot.name, snapshot: state.snapshot, revision: state.revision, shared: true, source_room_id: null, created_at: now, updated_at: now, realtime_epoch: EPOCH },
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
    localStorage.setItem("dormscape-cookie-consent", "rejected");
  }, [who.id, who.name]);
  await page.route(/\/api\/workspaces\//, async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.endsWith("/voice")) return route.fulfill({ json: { available: false } });
    if (req.method() === "GET") return route.fulfill({ json: detail(who) });
    const body = req.postDataJSON() ?? {};
    state.patches.push({ who: who.name, ...body });
    // A save becomes the room everyone loads next (the app tidies the fixture on its first save).
    if (body.action === "save") { state.snapshot = body.snapshot; state.revision++; return route.fulfill({ json: { ok: true, revision: state.revision } }); }
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
const scene = page => page.locator("[data-testid=room-3d]");
/** Switch an editor's room to 3D (or 2D) and wait for the scene. */
async function view(page, which) {
  await page.getByRole("group", { name: "Planner view" }).getByRole("button", { name: which === "3d" ? "3D" : "2D", exact: true }).click();
  if (which === "3d") { await scene(page).locator("canvas").waitFor({ timeout: 60_000 }); await page.waitForFunction(() => document.querySelector("[data-testid=room-3d] canvas")?.dataset.settled === "1", null, { timeout: 60_000 }).catch(() => {}); }
  else await surface(page).waitFor();
}
/** Record the cursor messages `page` receives (through the dev relay). */
const listen = page => page.evaluate(() => {
  window.__heard = [];
  if (window.__bus) return; // one listener per page, or each message would be counted twice
  window.__bus = new BroadcastChannel("dormscape-fake-realtime");
  window.__bus.onmessage = e => { if (e.data.kind === "broadcast") window.__heard.push({ topic: e.data.topic, event: e.data.event, payload: e.data.payload, at: Date.now() }); };
});
const heard = (page, event) => page.evaluate(event => window.__heard.filter(m => m.event === event), event);

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

/** A point on `page`'s plan (or 3D room) over a piece (`want: "piece"`) or the bare floor, found by moving there and
 * reading the cursor message `listener` receives. Returns client coordinates plus the message. */
async function findSpot(page, listener, want, area) {
  const box = await (area ?? surface(page)).boundingBox(), seen = [];
  for (let j = 2; j < 26; j++) for (let i = 2; i < 30; i += 2) {
    const x = box.x + box.width * (i + (j % 2)) / 31, y = box.y + box.height * j / 28;
    const fits = m => m && !m.clear && (want === "piece" ? m.id && (m.h === undefined || m.h > 1) : !m.id && !(m.h > .2));
    await page.mouse.move(x, y); await sleep(70);
    const m = (await heard(listener, "cursor")).at(-1)?.payload; seen.push(m ? (m.clear ? "clear" : m.id ?? "floor") : "none");
    if (!fits(m)) continue;
    // Confirm with a fresh message from a pixel away (the last one might have left before the move).
    await page.mouse.move(x + 1, y); await sleep(150);
    const last = (await heard(listener, "cursor")).at(-1)?.payload;
    if (fits(last)) return { x: x + 1, y, payload: last };
  }
  throw new Error(`No ${want} found (heard: ${[...new Set(seen)].join(", ")})`);
}
/** Tell every page the room changed (what the server's "updates" broadcast does after a comment). */
const changed = page => page.evaluate(topic => new BroadcastChannel("dormscape-fake-realtime").postMessage({ topic, kind: "broadcast", event: "changed", payload: {} }), `workspace:${ROOM}:${EPOCH}:updates`);
const pixelsDiffer = (a, b) => Buffer.compare(a, b) !== 0;
/** Pixels that changed by more than a rounding step (the 3D room's ambient occlusion can shift a value by one). */
async function changedPixels(a, b) {
  const sharp = require("sharp"), [x, y] = await Promise.all([a, b].map(png => sharp(png).raw().toBuffer()));
  let n = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 8) n++;
  return x.length === y.length ? n : Infinity;
}
/** The 3D room alone (cursors, pins and rings hidden for the shot). */
async function roomShot(page) {
  await page.evaluate(() => document.querySelectorAll("[data-testid=room-3d] [class*=cursorLayer]").forEach(el => { el.style.visibility = "hidden"; }));
  try { return await scene(page).locator("canvas").screenshot(); }
  finally { await page.evaluate(() => document.querySelectorAll("[data-testid=room-3d] [class*=cursorLayer]").forEach(el => { el.style.visibility = ""; })); }
}
/** When a ping first shows on `page` (its own clock, which the pages share). */
const watchPings = page => page.evaluate(() => { window.__pingSeen = null; new MutationObserver((_, o) => { if (document.querySelector("[data-ping]")) { window.__pingSeen = Date.now(); o.disconnect(); } }).observe(document.body, { childList: true, subtree: true }); });
const selected = page => page.locator("[role=toolbar][aria-label$=' actions']").getAttribute("aria-label").catch(() => null);
const panelTarget = page => page.locator("#room-side-panel select").inputValue();

/** Steady cursors for several people at once from a blank page (circles on the floor), for the frame-rate check. People
 * without a page of their own (Jo) get a stand-in presence. Returns a function that stops them. */
async function synthCursors(context, people, surfaceName) {
  const synth = await context.newPage();
  await synth.goto(`${BASE}/robots.txt`);
  await synth.evaluate(async ({ people, room, epoch, surfaceName }) => {
    const bus = new BroadcastChannel("dormscape-fake-realtime"), sessions = {};
    for (const [i, who] of people.entries()) {
      const topic = `workspace:${room}:${epoch}:${who.id}`;
      sessions[who.id] = await new Promise(resolve => {
        const done = setTimeout(() => { // nobody answered: stand in for this member
          const meta = { section: "room", view: surfaceName === "scene" ? "3d" : "2d", selected: null, session: `synthetic-${i}`, active: true, hidden: false, at: Date.now() };
          bus.postMessage({ topic, kind: "presence", key: meta.session, meta });
          bus.addEventListener("message", e => { if (e.data.topic === topic && e.data.kind === "hello") bus.postMessage({ topic, kind: "presence", key: meta.session, meta }); });
          resolve(meta.session);
        }, 600);
        bus.addEventListener("message", function hear(e) { if (e.data.topic === topic && e.data.kind === "presence" && e.data.meta) { clearTimeout(done); bus.removeEventListener("message", hear); resolve(e.data.meta.session); } });
        bus.postMessage({ topic, kind: "hello" });
      });
    }
    let seq = 0;
    window.__timer = setInterval(() => {
      const t = Date.now() / 1000;
      people.forEach((who, i) => bus.postMessage({ topic: `workspace:${room}:${epoch}:${who.id}`, kind: "broadcast", event: "cursor",
        payload: { surface: surfaceName, x: .5 + .3 * Math.cos(t * 1.7 + i * 2), y: .5 + .3 * Math.sin(t * 1.7 + i * 2), session: sessions[who.id], at: Date.now(), seq: ++seq } }));
    }, 40);
  }, { people, room: ROOM, epoch: EPOCH, surfaceName });
  return async () => { await synth.evaluate(() => clearInterval(window.__timer)); await synth.close(); };
}
/** Frames on `page` over `ms` (its own mouse moving too when `own`): frames per second and the slowest frames. */
async function frameRate(page, area, ms = 3000, own = true) {
  const box = await area.boundingBox();
  await page.evaluate(() => { window.__frames = []; const tick = t => { window.__frames.push(t); window.__fr = requestAnimationFrame(tick); }; window.__fr = requestAnimationFrame(tick); });
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const k = (Date.now() - t0) / ms; if (own) await page.mouse.move(box.x + box.width * (.3 + .4 * k), box.y + box.height * (.4 + .2 * Math.sin(k * 9))); await sleep(16); }
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__fr); return window.__frames; });
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  return { fps: Math.round(gaps.length / ((frames.at(-1) - frames[0]) / 1000)), p95FrameMs: Math.round(percentile(gaps, .95) * 10) / 10, longFrames: gaps.filter(g => g > 34).length };
}

const tests = {
  async gating({ context }) {
    // A separate browser profile, so the other tests' pages aren't in the room: the host alone sends no cursors.
    const solo = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
    try {
      const spy = await solo.newPage(); await spy.goto(`${BASE}/robots.txt`); await listen(spy);
      const host = await open(solo, OWNER), box = await surface(host).boundingBox();
      const wiggle = async () => { for (let k = 0; k < 20; k++) { await host.mouse.move(box.x + box.width * (.35 + k / 80), box.y + box.height * .6); await sleep(20); } await sleep(300); };
      await sleep(1500); await wiggle();
      ok((await heard(spy, "cursor")).length === 0, "Alone in the room, moving the mouse sends nothing");
      const guest = await open(solo, EDITOR); await sees(host, EDITOR);
      await wiggle();
      const sent = (await heard(spy, "cursor")).length;
      ok(sent > 0 && sent <= 20, `With someone watching it sends (${sent} messages for 20 moves over ~0.7 s)`);
      // The other tab goes to the background: sending stops again.
      await guest.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
      await sleep(500); const after = (await heard(spy, "cursor")).length; await wiggle();
      ok((await heard(spy, "cursor")).length - after <= 1, "When the only other tab is hidden, sending stops");
      // Rate: about 25 a second while moving.
      await guest.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
      await sleep(500); const from = (await heard(spy, "cursor")).length, t0 = Date.now();
      while (Date.now() - t0 < 2000) { const k = (Date.now() - t0) / 2000; await host.mouse.move(box.x + box.width * (.3 + .4 * k), box.y + box.height * .6); await sleep(8); }
      const rate = ((await heard(spy, "cursor")).length - from) / 2;
      results.sendRatePerSecond = rate;
      ok(rate >= 20 && rate <= 27, `While moving it sends about 25 a second (${rate}/s)`);
    } finally { await solo.close(); }
  },
  async regressions({ owner, editor, commenter }) {
    for (const p of [owner, editor, commenter]) await listen(p);
    await sees(owner, EDITOR);
    const zoomLevel = () => editor.getByLabel("Zoom level").textContent();
    // Selection: a click selects a piece, another click lets it go.
    const piece = await findSpot(editor, owner, "piece");
    await editor.mouse.click(piece.x, piece.y);
    const picked = await selected(editor);
    ok(picked, `A left click still selects a piece (${picked})`);
    await editor.mouse.click(piece.x, piece.y);
    ok(!(await selected(editor)), "…and a second click lets it go");
    // Openings: clicking a door or window handle still selects it for editing.
    const handle = await editor.evaluate(() => { const st = window.Konva?.stages?.[0]; const c = st?.container().getBoundingClientRect(); if (!c) return null;
      // The first door or window handle that's on screen.
      for (const n of st.find(".opening").map(o => o.findOne("Circle")).filter(Boolean)) { const r = n.getClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; if (x > 0 && y > 0 && x < c.width && y < c.height) return { x: c.left + x, y: c.top + y }; }
      return null; });
    if (handle) { await editor.mouse.click(handle.x, handle.y); ok(await editor.getByRole("button", { name: "Deselect opening" }).count() === 1, "Clicking a door or window still selects it for editing"); await editor.getByRole("button", { name: "Deselect opening" }).click(); }
    else console.log("  (skipped: Konva isn't on window, opening handle not located)");
    // Drag: pressing on the piece and moving drags it (a save follows with it moved).
    const saves = state.patches.filter(p => p.action === "save").length;
    await editor.mouse.move(piece.x, piece.y); await editor.mouse.down(); await editor.mouse.move(piece.x + 30, piece.y + 4, { steps: 6 }); await editor.mouse.up();
    await editor.waitForRequest(r => r.method() === "PATCH", { timeout: 8000 }).catch(() => {}); await sleep(300);
    ok(state.patches.filter(p => p.action === "save").length > saves, "Dragging a piece still moves it (and saves)");
    await editor.keyboard.press("Control+z"); await sleep(300);
    // Pan: dragging empty canvas moves the plan.
    const box = await surface(editor).boundingBox(), before = await editor.locator(".konvajs-content").screenshot();
    await editor.mouse.move(box.x + 30, box.y + box.height - 30); await editor.mouse.down(); await editor.mouse.move(box.x + 90, box.y + box.height - 50, { steps: 6 }); await editor.mouse.up();
    ok(pixelsDiffer(before, await editor.locator(".konvajs-content").screenshot()), "Dragging empty canvas still pans the plan");
    // Pinch zoom (two fingers).
    await editor.getByRole("button", { name: /^Fit/ }).first().click().catch(() => {});
    const z0 = await zoomLevel(), cdp = await editor.context().newCDPSession(editor), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx - 40, y: cy, id: 1 }, { x: cx + 40, y: cy, id: 2 }] });
    for (let k = 1; k <= 6; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx - 40 - k * 12, y: cy, id: 1 }, { x: cx + 40 + k * 12, y: cy, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(300);
    ok(await zoomLevel() !== z0, `Pinch still zooms the plan (${z0} -> ${await zoomLevel()})`);
    ok(await editor.getByRole("menu").count() === 0, "…without opening the canvas menu");
    // Existing comment pins and the commenter's click-to-comment.
    await commenter.getByRole("button", { name: /open conversation on Desk A/ }).click();
    ok(await panelTarget(commenter) === "furniture:desk-a", "A comment pin still opens its thread");
    await commenter.getByRole("button", { name: "Close comments" }).click();
    const theirs = await findSpot(commenter, owner, "piece");
    await commenter.mouse.click(theirs.x, theirs.y);
    await commenter.locator("#room-side-panel").waitFor();
    ok(await panelTarget(commenter) === `furniture:${theirs.payload.id}`, "A commenter's click on a piece still starts a comment on it");
    await commenter.getByRole("button", { name: "Close comments" }).click();
    // 3D: dragging empty space still orbits.
    await view(editor, "3d"); await editor.getByRole("button", { name: "Fit", exact: true }).click(); await sleep(900);
    const room = await roomShot(editor), b3 = await scene(editor).boundingBox();
    await editor.mouse.move(b3.x + 20, b3.y + 20); await editor.mouse.down(); await editor.mouse.move(b3.x + 120, b3.y + 40, { steps: 8 }); await editor.mouse.up(); await sleep(300);
    ok(await changedPixels(room, await roomShot(editor)) > 1000, "Dragging empty space in 3D still orbits");
    await view(editor, "2d");
  },
  async fps({ owner, editor, commenter, context }) {
    // Four people moving at once: three remote cursors (one a stand-in) plus the editor's own mouse.
    for (const which of ["2d", "3d"]) {
      // The stand-in cursors move for people whose pages sit still; a minute without input would show them as away.
      for (const p of [owner, commenter]) { await p.mouse.move(8, 8); await p.mouse.move(14, 12); }
      if (which === "3d") { await view(editor, "3d"); await editor.getByRole("button", { name: "Fit", exact: true }).click(); await sleep(800); }
      const stop = await synthCursors(context, [OWNER, COMMENTER, FOURTH], which === "3d" ? "scene" : "plan");
      await editor.locator("[data-cursor]").nth(2).waitFor({ state: "attached", timeout: 5000 });
      const area = which === "3d" ? scene(editor) : surface(editor);
      await editor.mouse.move(5, 5);
      const remote = await frameRate(editor, area, 3000, false), all = await frameRate(editor, area);
      await stop();
      (results.fps ??= {})[which] = { threeRemoteCursors: remote, plusOwnMouse: all };
      console.log(`  ${which}: three remote cursors moving:`, JSON.stringify(remote), "· plus your own mouse:", JSON.stringify(all));
      ok(remote.fps >= 55 && remote.p95FrameMs <= 20, `${which.toUpperCase()}: three moving cursors cost no frames (${remote.fps} fps, p95 ${remote.p95FrameMs} ms)`);
      ok(all.fps >= 55, `${which.toUpperCase()}: four people moving, ${all.fps} fps (p95 frame ${all.p95FrameMs} ms, dev build)`);
    }
    await editor.mouse.move(5, 5);
    await view(editor, "2d");
  },
  async reduced({ owner, editor }) {
    await listen(owner); await owner.emulateMedia({ reducedMotion: "reduce" });
    const target = await findSpot(editor, owner, "piece");
    await editor.mouse.click(target.x, target.y, { button: "right" });
    await editor.getByRole("menu", { name: "Canvas actions" }).getByRole("menuitem", { name: "Look here" }).click();
    const ping = owner.locator("[data-ping]").first();
    await ping.waitFor({ state: "attached" });
    ok(await ping.evaluate(el => getComputedStyle(el, "::before").animationName === "none" && getComputedStyle(el, "::after").display === "none"), "With reduced motion the ping is a still ring");
    await owner.emulateMedia({ reducedMotion: null });
    await sleep(3200);
  },
  async follow({ owner, editor }) {
    await owner.mouse.move(8, 8); await owner.mouse.move(12, 12); // a minute without input reads as away; you can only follow someone who's here
    await sees(editor, OWNER);
    await editor.locator("aside[aria-label='Room filters and people'] li", { hasText: OWNER.name }).getByRole("button", { name: "Follow" }).click();
    await editor.getByText(/You're following Alex/).waitFor();
    await view(owner, "3d");
    await scene(editor).locator("canvas").waitFor({ timeout: 30_000 });
    ok(true, "Follow mode: the editor's view follows the host into 3D");
    await view(owner, "2d"); await surface(editor).waitFor();
    await editor.getByRole("button", { name: "Stop" }).click();
    ok(await editor.getByText(/You're following/).count() === 0, "…and Stop ends it");
  },
  async gestures({ owner, editor, commenter }) {
    for (const p of [owner, editor, commenter]) await listen(p);
    await sees(commenter, EDITOR);
    // Commenter, 2D: a right-click opens the composer on that piece, no menu.
    const piece = await findSpot(commenter, owner, "piece");
    await commenter.mouse.click(piece.x, piece.y, { button: "right" });
    await commenter.locator("#room-side-panel").waitFor();
    ok(await panelTarget(commenter) === `furniture:${piece.payload.id}`, `Commenter right-click comments on ${piece.payload.id}`);
    ok(await commenter.locator("#room-comment-body").evaluate(el => el === document.activeElement), "The composer is ready to type in");
    ok(await commenter.getByRole("menu").count() === 0, "Commenters get no menu (one action)");
    // Commenter: a double-click on the floor comments on that spot.
    await commenter.getByRole("button", { name: "Close comments" }).click();
    const floor = await findSpot(commenter, owner, "floor");
    await commenter.mouse.dblclick(floor.x, floor.y);
    await commenter.locator("#room-side-panel").waitFor();
    const spot = await panelTarget(commenter);
    ok(/^point:0(\.\d+)?:0(\.\d+)?$/.test(spot), `Commenter double-click on the floor comments on a spot (${spot})`);
    const name = await commenter.locator("#room-side-panel select option:checked").textContent();
    ok(/^Spot (near |on the floor|by the window)/.test(name), `The spot is named for what's near it ("${name}")`);
    await commenter.getByRole("button", { name: "Close comments" }).click();

    // Editor, 2D: right-click a piece opens the menu; nothing is selected, dragged or panned.
    const target = await findSpot(editor, owner, "piece");
    await sleep(400);
    const before = await selected(editor), stage = await editor.locator(".konvajs-content canvas").first().screenshot();
    await editor.mouse.click(target.x, target.y, { button: "right" });
    const menu = editor.getByRole("menu", { name: "Canvas actions" });
    await menu.waitFor();
    const item = (await menu.getByRole("menuitem").first().textContent()).trim();
    ok(/^Comment on .+/.test(item), `Editor right-click opens the menu ("${item}")`);
    ok(await selected(editor) === before, "The right-click changed no selection");
    await editor.keyboard.press("Escape");
    await menu.waitFor({ state: "detached" });
    ok(await editor.evaluate(() => document.activeElement?.getAttribute("aria-label")) === "Interactive room floor plan", "Escape closes the menu and focus returns to the plan");
    await editor.evaluate(() => document.activeElement?.blur()); // the focus ring isn't a change to the plan
    const after = await editor.locator(".konvajs-content canvas").first().screenshot();
    if (Buffer.compare(stage, after)) { fs.writeFileSync(path.join(OUT, "plan-before.png"), stage); fs.writeFileSync(path.join(OUT, "plan-after.png"), after); }
    ok(Buffer.compare(stage, after) === 0, "The plan didn't pan, zoom or change");
    await editor.mouse.click(target.x, target.y, { button: "right" });
    await menu.getByRole("menuitem", { name: item }).click();
    ok(await panelTarget(editor) === `furniture:${target.payload.id}`, "Comment on … opens the composer on that piece");
    await editor.getByRole("button", { name: "Close comments" }).click();
    // Mac Ctrl-click: the same menu, still no selection.
    if ((await editor.evaluate(() => navigator.userAgent)).includes("Mac")) {
      await editor.keyboard.down("Control"); await editor.mouse.click(target.x, target.y); await editor.keyboard.up("Control");
      ok(await selected(editor) === before, "Ctrl-click (Mac) never selects");
      if (await menu.count()) { ok(true, "Ctrl-click opens the menu"); await editor.keyboard.press("Escape"); }
    }
    // Double-click: comments straight away and leaves the piece selected.
    await editor.mouse.dblclick(target.x, target.y);
    await editor.locator("#room-side-panel").waitFor();
    ok(await panelTarget(editor) === `furniture:${target.payload.id}`, "Editor double-click comments straight away");
    ok((await selected(editor)) !== null, `The double-clicked piece stays selected (${await selected(editor)})`);
    await editor.getByRole("button", { name: "Close comments" }).click();
    // Long press (touch) on the floor: the same menu, no tap afterwards.
    const cdp = await editor.context().newCDPSession(editor), spot2 = await findSpot(editor, owner, "floor"), held = await selected(editor);
    await editor.mouse.move(5, 5);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: spot2.x, y: spot2.y }] });
    await sleep(750);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await menu.waitFor({ timeout: 2000 });
    ok((await menu.getByRole("menuitem").first().textContent()).trim() === "Comment here", "A long press on the floor opens the menu for that spot");
    await editor.keyboard.press("Escape");
    ok(await selected(editor) === held, "Lifting the finger after a long press isn't a tap (selection kept)");
    await editor.screenshot({ path: path.join(OUT, `gestures-2d-${label}.png`) });
  },
  async highlight({ editor, commenter }) {
    const plan = () => editor.locator(".konvajs-content").screenshot();
    await editor.getByRole("button", { name: /comments/i }).first().click();
    const scoped = editor.getByRole("checkbox", { name: /Only notes about/ });
    if (await scoped.count()) await scoped.uncheck(); // an earlier test left the panel on one piece
    const thread = editor.locator("#room-side-panel article", { hasText: "Desk by the window?" });
    await thread.waitFor();
    await editor.mouse.move(5, 5); await sleep(400);
    const before = await plan();
    await thread.hover(); await sleep(200);
    const hovered = await plan();
    ok(pixelsDiffer(before, hovered), "Hovering a thread outlines its piece on the plan");
    await editor.screenshot({ path: path.join(OUT, `highlight-2d-${label}.png`) });
    await editor.mouse.move(5, 5); await sleep(200);
    ok(!pixelsDiffer(before, await plan()), "The outline clears when the row isn't hovered");
    await thread.getByRole("button", { name: "Reply" }).focus(); await sleep(200);
    ok(pixelsDiffer(before, await plan()), "Focusing a thread outlines it too (keyboard)");
    await editor.evaluate(() => document.activeElement?.blur()); await sleep(200);
    ok(!pixelsDiffer(before, await plan()), "Moving focus away clears it");
    await editor.getByRole("button", { name: "Close comments" }).click(); await sleep(200);
    // A spot comment: its pin appears for others, Locate centres the plan on it, and it's ringed while the panel is on it.
    await listen(editor);
    const floor = await findSpot(commenter, editor, "floor");
    await commenter.mouse.dblclick(floor.x, floor.y);
    await commenter.locator("#room-comment-body").fill("Beanbag here?");
    await commenter.getByRole("button", { name: "Post comment" }).click();
    await commenter.locator("#room-side-panel article", { hasText: "Beanbag here?" }).waitFor();
    const spot = state.comments.at(-1).target;
    ok(/^point:/.test(spot), `The commenter's spot comment was saved as ${spot}`);
    ok(await commenter.locator(`[data-ring="${spot}"]`).count() === 1, "The spot the panel is on has a ring on the plan");
    await changed(commenter);
    const pinned = editor.getByRole("button", { name: /open conversation on Spot /i });
    await pinned.waitFor({ timeout: 5000 });
    ok(true, `Others see a pin on the spot ("${await pinned.getAttribute("aria-label")}")`);
    await pinned.click();
    await editor.locator("#room-side-panel").waitFor();
    const zoom = () => editor.locator("[class*=CanvasToolRail], [aria-label*=Zoom]").allTextContents();
    const before2 = await plan();
    await editor.locator("#room-side-panel article", { hasText: "Beanbag here?" }).getByTitle("Show it in the room").click(); await sleep(400);
    ok(pixelsDiffer(before2, await plan()), "Locate centres and zooms the plan on the spot");
    await editor.screenshot({ path: path.join(OUT, `spot-2d-${label}.png`) });
    await editor.getByRole("button", { name: "Close comments" }).click();
    await commenter.getByRole("button", { name: "Close comments" }).click();
    void zoom;
  },
  async pings({ owner, editor, commenter }) {
    for (const p of [owner, editor, commenter]) await listen(p);
    await sees(owner, EDITOR); await sees(commenter, EDITOR);
    // An editor's "Look here" on a piece: everyone else sees it within the cursor budget, with the piece outlined.
    const target = await findSpot(editor, owner, "piece");
    await editor.mouse.click(target.x, target.y, { button: "right" });
    const menu = editor.getByRole("menu", { name: "Canvas actions" });
    await menu.waitFor();
    ok((await menu.getByRole("menuitem").allTextContents()).map(t => t.trim()).join(" | ").match(/^Comment on .+ \| Look here$/), "Editors get the two-item menu: Comment on … and Look here");
    await owner.mouse.move(5, 5); await commenter.mouse.move(5, 5); await sleep(300);
    const plain = await owner.locator(".konvajs-content").screenshot();
    await Promise.all([owner, commenter].map(watchPings));
    const sent = Date.now();
    await menu.getByRole("menuitem", { name: "Look here" }).click();
    await owner.locator("[data-ping]").first().waitFor({ state: "attached" }); await commenter.locator("[data-ping]").first().waitFor({ state: "attached" });
    const delays = await Promise.all([owner, commenter].map(p => p.evaluate(() => window.__pingSeen)));
    results.pingDelayMs = delays.map(t => t - sent);
    ok(results.pingDelayMs.every(d => d <= 250), `The ping shows for the owner and the commenter within the cursor budget (${results.pingDelayMs.join(", ")} ms)`);
    ok(await editor.locator("[data-ping]").count() >= 1, "The sender sees their own ping");
    const theirs = await owner.locator("[data-ping]").first().boundingBox(), box = await surface(owner).boundingBox(), mine = await surface(editor).boundingBox();
    const off = Math.hypot(theirs.x - box.x - (target.x - mine.x), theirs.y - box.y - (target.y - mine.y));
    ok(off < 6, `It lands where the editor pointed (${Math.round(off * 10) / 10} px off on the host's plan)`);
    ok(await changedPixels(plain, await owner.locator(".konvajs-content").screenshot()) > 100, "The pinged piece is outlined on the host's plan");
    const said = await owner.locator("p.ds-sr[role=status]").allTextContents();
    ok(said.some(t => /^Sam: look here, .+\.$/.test(t)), `Screen readers hear it ("${said.find(t => t.startsWith("Sam"))}")`);
    await owner.screenshot({ path: path.join(OUT, `ping-2d-${label}.png`) });
    await sleep(3300);
    ok(await owner.locator("[data-ping]").count() === 0, "The ping is gone after about 3 s (nothing is saved)");
    ok(!state.patches.some(p => JSON.stringify(p).includes("ping")), "No ping was sent to the server");
    // Keyboard: Shift+F10 on the selected piece opens the same menu; arrows move, Enter picks, focus returns to the plan.
    await editor.mouse.click(target.x, target.y); await sleep(200);
    if (!(await selected(editor))) { await editor.mouse.click(target.x, target.y); await sleep(200); }
    await editor.keyboard.press("Shift+F10");
    await menu.waitFor();
    ok(await menu.getByRole("menuitem").first().evaluate(el => el === document.activeElement), "Shift+F10 on the selected piece opens the menu with focus on its first item");
    await editor.keyboard.press("ArrowDown");
    ok((await editor.evaluate(() => document.activeElement?.textContent)) === "Look here", "Arrow keys move through the menu");
    await editor.keyboard.press("Enter");
    await menu.waitFor({ state: "detached" });
    ok(await editor.evaluate(() => document.activeElement?.getAttribute("aria-label")) === "Interactive room floor plan", "Choosing Look here returns focus to the plan");
    await editor.mouse.click(target.x, target.y); // deselect
    await sleep(3300);
    // Limits: a second ping within 1.5 s isn't shown to others.
    const heardBefore = (await heard(owner, "ping")).length;
    await editor.mouse.click(target.x, target.y, { button: "right" }); await menu.getByRole("menuitem", { name: "Look here" }).click();
    await owner.locator("[data-ping]").first().waitFor({ state: "attached" });
    await editor.mouse.click(target.x + 20, target.y, { button: "right" }); await menu.getByRole("menuitem", { name: "Look here" }).click();
    await sleep(400);
    const keys = await owner.locator("[data-ping]").evaluateAll(els => els.map(e => e.dataset.ping));
    ok(keys.length === 1 && (await heard(owner, "ping")).length - heardBefore === 2, "A second ping within 1.5 s reaches others but isn't shown");
    await sleep(3200);
    // A forged ping from the commenter (on their own channel, the only one they can publish on) is ignored.
    const forged = await commenter.evaluate(([topic]) => { const at = Date.now(); new BroadcastChannel("dormscape-fake-realtime").postMessage({ topic, kind: "broadcast", event: "ping", payload: { x: .5, y: .5, session: "forged", at, seq: 1 } }); return at; }, [`workspace:${ROOM}:${EPOCH}:${COMMENTER.id}`]);
    await sleep(500);
    ok(forged && await owner.locator("[data-ping]").count() === 0 && await editor.locator("[data-ping]").count() === 0, "A forged ping from the commenter is ignored by everyone");
    // On another tab: the room bar offers to show it.
    await commenter.getByRole("button", { name: /Who brings what/ }).first().click();
    await editor.mouse.click(target.x, target.y, { button: "right" }); await menu.getByRole("menuitem", { name: "Look here" }).click();
    const notice = commenter.getByRole("button", { name: "Show", exact: true });
    await notice.waitFor({ timeout: 2000 });
    const text = await commenter.locator("[class*=pingNotice]").textContent();
    ok(/^SSam wants you to look at .+Show×$/.test(text), `Away from the room, the bar says "${text.replace(/^S/, "").replace(/Show×$/, "")}" with Show`);
    await commenter.screenshot({ path: path.join(OUT, `ping-notice-${label}.png`) });
    await notice.click();
    await surface(commenter).waitFor();
    ok(await commenter.locator("[data-section=room]").count() === 1, "Show switches to the room");
    await sleep(3200);
    // Pings follow the "Everyone's cursors" switch.
    await owner.getByRole("switch", { name: "Everyone's cursors" }).click();
    await editor.mouse.click(target.x, target.y, { button: "right" }); await menu.getByRole("menuitem", { name: "Look here" }).click();
    await sleep(600);
    ok(await owner.locator("[data-ping]").count() === 0 && await commenter.locator("[data-ping]").count() === 1, "With Everyone's cursors off, the host sees no pings (the commenter still does)");
    await owner.getByRole("switch", { name: "Everyone's cursors" }).click();
    await sleep(3000);
  },
  async scene3d({ owner, editor }) {
    await view(owner, "3d"); await view(editor, "3d"); await listen(editor); await listen(owner);
    // Both cameras on the default framing (a Locate in an earlier test turned the editor's).
    await editor.getByRole("button", { name: "Fit", exact: true }).click(); await sleep(800);
    const box = await scene(owner).boundingBox(), theirs = await scene(editor).boundingBox();
    // Find a spot on top of a piece (a hit with a height), then compare where each screen shows the pointer.
    let found = null;
    for (let j = 3; j < 9 && !found; j++) for (let i = 2; i < 12 && !found; i++) {
      const at = { x: box.x + box.width * i / 14, y: box.y + box.height * j / 12 };
      await owner.mouse.move(at.x, at.y); await sleep(90);
      const last = (await heard(editor, "cursor")).at(-1)?.payload;
      if (last?.id && last.h > 1.2) found = { at, last };
    }
    ok(found, `3D pointing reports the piece and its height (${found?.last.id}, ${found?.last.h} ft)`);
    await sleep(400);
    const drawn = await editor.locator(`[data-cursor="${OWNER.id}"]`).boundingBox();
    const error = Math.hypot(drawn.x - theirs.x - (found.at.x - box.x), drawn.y - theirs.y - (found.at.y - box.y));
    results.scene3dErrorPx = Math.round(error * 10) / 10;
    if (error >= 4) { await owner.screenshot({ path: path.join(OUT, "scene3d-owner-fail.png") }); await editor.screenshot({ path: path.join(OUT, "scene3d-editor-fail.png") }); console.log("  drawn", JSON.stringify(drawn), "theirs", JSON.stringify(theirs), "mine", JSON.stringify(box), JSON.stringify(found.at)); }
    ok(error < 4, `The 3D viewer draws it on the piece, where the owner points (${results.scene3dErrorPx} px off)`);
    // A wall: aim high near the top of the far wall (no piece, height above the floor).
    let wall = null, wallAt = null;
    for (let j = 1; j < 5 && !wall; j++) for (let i = 4; i < 10 && !wall; i++) {
      await owner.mouse.move(box.x + box.width * i / 14, box.y + box.height * j / 12); await sleep(90);
      const last = (await heard(editor, "cursor")).at(-1)?.payload;
      if (last && !last.id && last.h > 2) { wall = last; wallAt = { x: box.x + box.width * i / 14 - box.x + theirs.x, y: box.y + box.height * j / 12 - box.y + theirs.y }; }
    }
    ok(wall, `Pointing at a wall reports a point on it (${wall?.h} ft up)`);
    // Gestures in 3D: right-click a piece opens the menu without selecting or orbiting; double-click comments.
    const editing = () => editor.getByRole("button", { name: "Edit selected" }).count();
    const mine = await findSpot(editor, owner, "piece", scene(editor)), wasEditing = await editing();
    await editor.waitForFunction(() => document.querySelector("[data-testid=room-3d] canvas")?.dataset.settled === "1", null, { timeout: 30_000 }).catch(() => {});
    const room = await roomShot(editor);
    await editor.mouse.click(mine.x, mine.y, { button: "right" });
    const menu = editor.getByRole("menu", { name: "Canvas actions" });
    await menu.waitFor();
    const item = (await menu.getByRole("menuitem").first().textContent()).trim();
    ok(item.startsWith("Comment on "), `3D right-click on ${mine.payload.id} opens the menu ("${item}")`);
    ok(await editing() === wasEditing, "The 3D right-click selected nothing");
    await editor.keyboard.press("Escape");
    ok(await editor.evaluate(() => document.activeElement?.tagName) === "CANVAS", "Escape returns focus to the 3D room");
    await editor.evaluate(() => document.activeElement?.blur());
    await sleep(300);
    await editor.waitForFunction(() => document.querySelector("[data-testid=room-3d] canvas")?.dataset.settled === "1", null, { timeout: 30_000 }).catch(() => {});
    const roomAfter = await roomShot(editor);
    if (Buffer.compare(room, roomAfter)) { fs.writeFileSync(path.join(OUT, "room-before.png"), room); fs.writeFileSync(path.join(OUT, "room-after.png"), roomAfter); }
    ok(await changedPixels(room, roomAfter) === 0, "The room didn't orbit or change");
    // "Look here" in 3D: it lands on the piece for the host (same camera), and the piece is outlined in the room.
    await owner.mouse.move(5, 5); await sleep(300);
    const hostRoom = await roomShot(owner), hostBox = await scene(owner).boundingBox(), myBox = await scene(editor).boundingBox();
    await editor.mouse.click(mine.x, mine.y, { button: "right" }); await menu.getByRole("menuitem", { name: "Look here" }).click();
    await owner.locator("[data-ping]").first().waitFor({ state: "attached" }); await sleep(250);
    const landed = await owner.locator("[data-ping]").first().boundingBox();
    const miss = Math.hypot(landed.x - hostBox.x - (mine.x - myBox.x), landed.y - hostBox.y - (mine.y - myBox.y));
    ok(miss < 6, `A 3D ping lands on the piece for the host (${Math.round(miss * 10) / 10} px off)`);
    ok(await changedPixels(hostRoom, await roomShot(owner)) > 100, "The pinged piece is outlined in the host's 3D room");
    await owner.screenshot({ path: path.join(OUT, `ping-3d-${label}.png`) });
    await sleep(3200);
    await editor.mouse.dblclick(mine.x, mine.y);
    await editor.locator("#room-side-panel").waitFor();
    ok(await panelTarget(editor) === `furniture:${mine.payload.id}`, "3D double-click comments on that piece");
    await editor.getByRole("button", { name: "Close comments" }).click();
    await sleep(800); // the room widens again and the camera refits
    await editor.mouse.click(wallAt.x, wallAt.y, { button: "right" });
    await menu.waitFor();
    await menu.getByRole("menuitem", { name: "Comment here" }).click();
    const spot = await panelTarget(editor);
    ok(/^point:[\d.]+:[\d.]+:\d+(\.\d+)?$/.test(spot), `A spot on a 3D wall keeps its height (${spot})`);
    ok(await editor.locator(`[data-ring="${spot}"]`).isVisible(), "The new 3D spot is ringed while the panel is on it");
    // Hovering a thread outlines its piece in the room (a box outline, no extra pass), and clears after.
    const thread = editor.locator("#room-side-panel article", { hasText: "Desk by the window?" });
    await editor.getByRole("checkbox", { name: /Only notes about/ }).uncheck();
    await editor.mouse.move(5, 5); await sleep(300);
    const settle = () => editor.waitForFunction(() => document.querySelector("[data-testid=room-3d] canvas")?.dataset.settled === "1", null, { timeout: 30_000 }).catch(() => {});
    await settle(); const plain = await roomShot(editor);
    await thread.hover(); await sleep(300); await settle();
    ok(await changedPixels(plain, await roomShot(editor)) > 200, "Hovering a thread outlines its piece in 3D");
    await editor.screenshot({ path: path.join(OUT, `highlight-3d-${label}.png`) });
    await editor.mouse.move(5, 5); await sleep(300); await settle();
    const cleared = await roomShot(editor);
    if (pixelsDiffer(plain, cleared)) { fs.writeFileSync(path.join(OUT, "room3d-plain.png"), plain); fs.writeFileSync(path.join(OUT, "room3d-cleared.png"), cleared); }
    ok(await changedPixels(plain, cleared) === 0, "…and the outline clears after");
    await editor.getByRole("button", { name: "Close comments" }).click();
    await editor.screenshot({ path: path.join(OUT, `scene3d-${label}.png`) });
    await owner.mouse.move(5, 5);
    await view(owner, "2d"); await view(editor, "2d");
  },
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
    // The host's first autosave tidies the fixture into the app's own shape; the others then load that.
    const owner = await open(context, OWNER, "?debug=cursors");
    await owner.waitForRequest(r => r.method() === "PATCH", { timeout: 8000 }).catch(() => {}); await sleep(800);
    const editor = await open(context, EDITOR, "?debug=cursors"), commenter = await open(context, COMMENTER);
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
