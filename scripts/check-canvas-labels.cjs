// Run with: node scripts/check-canvas-labels.cjs
// Exercise the production drag callbacks on native Konva nodes, without a DOM.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const Konva = require("konva").default;
const { applyNodeProps } = require("react-konva/lib/makeUpdates.js");

const filename = path.join(__dirname, "../components/canvas/RoomCanvas.tsx");
const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let dragMove, dragEnd, dragPosition;
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(source) === "onDragMove" && node.initializer.expression.getText(source).includes("labelRefs.current")) dragMove = node.initializer.expression.getText(source);
  if (ts.isFunctionDeclaration(node)) {
    if (node.name?.text === "handleDragEnd") dragEnd = node.getText(source);
    if (node.name?.text === "dragPosition") dragPosition = node.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert(dragMove && dragEnd && dragPosition, "Production drag callbacks must exist");

// The small geometry modules only have type imports, which transpilation removes.
function loadGeometry(name, imports = {}) {
  const file = path.join(__dirname, `../components/canvas/${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: id => imports[id] });
  return module.exports;
}
const geometry = loadGeometry("geometry");
const viewport = loadGeometry("viewport", { "./geometry": geometry });
assert.equal(viewport.pointerRotation(0, {x:10,y:20}, {x:10,y:0}, {x:30,y:20}), 90);
assert.equal(viewport.pointerRotation(32.5, {x:10,y:20}, {x:10,y:0}, {x:-10,y:20}), 302.5);
assert.equal(viewport.pointerRotation(32.5, {x:100,y:200}, {x:100,y:140}, {x:40,y:200}), 302.5, "Zoom and pan cannot change the relative rotation");
assert.equal(viewport.pointerRotation(345, {x:0,y:0}, {x:10,y:0}, {x:0,y:10}), 75, "Rotation wraps through 360 degrees");
const f = { id: "bed", x_ft: 2, y_ft: 3, width_ft: 3, length_ft: 6, rotation_deg: 0 };
const item = new Konva.Group({ x: 68, y: 88 });
const label = new Konva.Group({ x: 68, y: 88 });
const overlay = new Konva.Group();
const world = new Konva.Group({ x: -73, y: 51, scaleX: 1.75, scaleY: 1.75 });
world.add(item, overlay); overlay.add(label);
const originalProps = { x: 68, y: 88 };
let dragging = null, moves = 0;
const sandbox = {
  module: { exports: {} }, f, PAD: 28, pxFt: 20, roomL: 15, roomW: 12, snapping: true,
  footprint: geometry.footprint, placedCoordinate: viewport.placedCoordinate,
  labelRefs: { current: new Map([[f.id, label]]) }, dragGuard: { current: 0 },
  setDragging: value => { dragging = typeof value === "function" ? value(dragging) : value; },
  onMove: () => { moves++; },
};
const code = ts.transpileModule(`${dragPosition}\n${dragEnd}\nmodule.exports = { move: ${dragMove}, end: handleDragEnd };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, sandbox);
const handlers = sandbox.module.exports;
applyNodeProps(item, { onDragMove: handlers.move, onDragEnd: event => handlers.end(f, event) });

for (const [x, y] of [[68.2, 88.3], [68.7, 88.8], [74.9, 92.1], [120.37, 174.21], [-12.6, 320.77]]) {
  item.position({ x, y }); item.fire("dragmove");
  assert.equal(label.x(), item.x(), "Label must follow raw x, before snapping or a React render");
  assert.equal(label.y(), item.y(), "Label must follow raw y, before snapping or a React render");
  assert.deepEqual(label.getAbsolutePosition(), item.getAbsolutePosition(), "Zoom and pan must keep the nodes aligned");
  applyNodeProps(label, { ...originalProps }, originalProps);
  assert.equal(label.x(), x, "An unchanged React position prop must not reset the moving label");
}
item.fire("dragend");
assert.deepEqual(label.position(), item.position(), "Furniture and label must snap together on release");
assert.equal(dragging, null);
assert.equal(moves, 1);

item.position({ x: 68.3, y: 88.4 }); item.fire("dragmove"); item.fire("dragend");
assert.deepEqual(label.position(), originalProps, "Returning to the same grid cell must restore the label too");
assert.equal(moves, 1, "A drag ending at the original position must not create an edit");
world.destroy();
console.log("Canvas labels: fractional movement, zoom/pan, React updates, snapping, and same-cell release passed.");
