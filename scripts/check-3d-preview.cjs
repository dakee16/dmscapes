// Run with: node scripts/check-3d-preview.cjs
// Exercise the production preview effect with a deterministic clock.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const file = path.join(__dirname, "../components/studio/RoomScene.tsx");
const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0].getText(source).includes('openUpgrade("room-3d"')) effect = node.arguments[0].getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert(effect, "The 3D preview must have a delayed upgrade effect");
function preview(overrides = {}) {
  let time = 0, pending, prompt, returned = false;
  const context = {
    enabled: true, allowed: false, ready: true, error: "", props: { preview: true },
    current: { current: { onFallback: () => { returned = true; } } },
    setTimeout: (run, delay) => { pending = { run, at: time + delay }; return 1; },
    clearTimeout: () => { pending = undefined; },
    openUpgrade: (reason, close) => { prompt = { reason, close }; },
    ...overrides,
  };
  const cleanup = vm.runInNewContext(`(${effect})()`, context);
  return {
    tick(ms) { time += ms; if (pending && time >= pending.at) { const run = pending.run; pending = undefined; run(); } },
    cleanup,
    get prompt() { return prompt; },
    get returned() { return returned; },
  };
}
const trial = preview();
trial.tick(999); assert.equal(trial.prompt, undefined, "Show the room for a full second");
trial.tick(1); assert.equal(trial.prompt.reason, "room-3d");
assert.equal(trial.returned, false, "Keep the room visible behind the prompt");
trial.prompt.close(); assert.equal(trial.returned, true, "Dismissal returns to 2D");
for (const state of [{ready:false}, {allowed:true}, {enabled:false}, {error:"WebGL unavailable"}, {props:{preview:false}}]) {
  const p = preview(state); p.tick(10000); assert.equal(p.prompt, undefined, JSON.stringify(state));
}
const cancelled = preview(); cancelled.tick(500); cancelled.cleanup(); cancelled.tick(1000);
assert.equal(cancelled.prompt, undefined, "Switching to 2D or unmounting cancels the prompt");
console.log("PASS: prompt waits for a rendered room + 1 second, skips Pro/loading/errors, cancels on exit, and dismisses to 2D.");
