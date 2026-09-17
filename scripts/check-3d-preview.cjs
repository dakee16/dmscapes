// Run with: node scripts/check-3d-preview.cjs
// Exercise the production gate without waiting for a timer or a rendered frame.
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
assert(effect, "The 3D preview must have an upgrade effect");
function preview(overrides = {}) {
  let prompt, returned = false;
  const context = {
    enabled: true, allowed: false, ready: false, error: "", props: { preview: true },
    current: { current: { onFallback: () => { returned = true; } } },
    setTimeout: () => assert.fail("The 3D gate must not wait for a preview timer"),
    openUpgrade: (reason, close) => { prompt = { reason, close }; },
    ...overrides,
  };
  vm.runInNewContext(`(${effect})()`, context);
  return {
    get prompt() { return prompt; },
    get returned() { return returned; },
  };
}
const trial = preview();
assert.equal(trial.prompt?.reason, "room-3d", "Open immediately, even before the first 3D frame");
assert.equal(trial.returned, false, "Keep the room visible behind the prompt");
trial.prompt.close(); assert.equal(trial.returned, true, "Dismissal returns to 2D");
for (const state of [{allowed:true}, {enabled:false}, {props:{preview:false}}]) {
  assert.equal(preview(state).prompt, undefined, JSON.stringify(state));
}
for (const state of [{ready:true}, {error:"WebGL unavailable"}]) {
  assert.equal(preview(state).prompt?.reason, "room-3d", "Rendering must not control access");
}
console.log("PASS: prompt opens immediately, skips Pro/auth-loading/non-preview views, keeps the room behind it, and dismisses to 2D.");
