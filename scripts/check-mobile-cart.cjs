// Run with: node scripts/check-mobile-cart.cjs
// Both planner views must open the same accessible mobile drawer.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const file = path.join(__dirname, "../components/studio/PlannerStudio.tsx");
const source = ts.createSourceFile(file, fs.readFileSync(file,"utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let open, focus;
const attributes = {};
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "open") open = node.getText(source);
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0].getText(source).includes("closeRef.current?.focus")) focus = node.arguments[0].getText(source);
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "aside") {
    for (const attr of node.attributes.properties) if (ts.isJsxAttribute(attr) && ["role","aria-modal","inert"].includes(attr.name.getText(source))) attributes[attr.name.getText(source)] = attr.initializer.expression.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert(open && focus && attributes.role);
for (const view of ["2d","3d"]) {
  let panel, mobileOpen = false, nextFrame, focused = false, restored = false;
  const context = {view, compact:true, mobileOpen:false, preview:false, allowed3D:true,
    setPanel:value=>{panel=value;}, setMobileOpen:value=>{mobileOpen=value;}, setMoveMode:()=>{},
    document:{body:{style:{overflow:"auto"}},activeElement:{focus:()=>{restored=true;}}},
    closeRef:{current:{focus:()=>{focused=true;}}},
    requestAnimationFrame:fn=>{nextFrame=fn;return 1;}, cancelAnimationFrame:()=>{},
  };
  vm.runInNewContext(ts.transpile(`${open};open("shop")`),context);
  assert.equal(panel,"shop"); assert.equal(mobileOpen,true);
  context.mobileOpen = mobileOpen;
  for (const [key,value] of Object.entries({role:"dialog","aria-modal":true,inert:false})) assert.equal(vm.runInNewContext(attributes[key],context),value,view+" "+key);
  const cleanup = vm.runInNewContext(ts.transpile(`(${focus})()`),context);
  assert.equal(context.document.body.style.overflow,"hidden"); nextFrame(); assert(focused);
  cleanup(); assert.equal(context.document.body.style.overflow,"auto"); assert(restored);
  context.mobileOpen=false; assert.equal(vm.runInNewContext(attributes.inert,context),true);
}
console.log("PASS: mobile cart opens in 2D and 3D, locks background scrolling, focuses the drawer, and restores focus on close.");
