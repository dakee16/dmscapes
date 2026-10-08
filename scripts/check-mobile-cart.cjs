// Run with: node scripts/check-mobile-cart.cjs
// On phones, 2D keeps the shopping list in a bottom sheet under the plan and 3D opens it as an accessible modal drawer.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const file = path.join(__dirname, "../components/studio/PlannerStudio.tsx");
const source = ts.createSourceFile(file, fs.readFileSync(file,"utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let open, focus, editOpenings, activePanel, sidePanel, roomSettings;
const attributes = {};
const isPanel = node => node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === "id" && attr.initializer?.getText(source) === '"studio-panel"');
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "open") open = node.getText(source);
  if (ts.isFunctionDeclaration(node) && node.name?.text === "editOpenings") editOpenings = node.getText(source);
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "activePanel") activePanel = node.initializer.getText(source);
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "sidePanel") sidePanel = node.initializer.getText(source);
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "roomSettings") roomSettings = node.initializer.getText(source);
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0].getText(source).includes("closeRef.current?.focus")) focus = node.arguments[0].getText(source);
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "aside" && isPanel(node)) {
    for (const attr of node.attributes.properties) if (ts.isJsxAttribute(attr) && ["role","aria-modal","inert"].includes(attr.name.getText(source))) attributes[attr.name.getText(source)] = attr.initializer.expression.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert(open && focus && attributes.role);
assert(editOpenings && activePanel && sidePanel);
assert(roomSettings?.includes("<OpeningTools"),"The 3D Room panel holds the door and window tools");
assert(source.text.includes("const [editingRoom,setEditingRoom]=useState(false)"),"Room geometry editing starts closed");
assert(source.text.includes("editingRoom&&isPaid(profile)&&<Modal"),"The geometry editor is explicitly opened and paid-gated");
const resolvePanel = context => vm.runInNewContext(activePanel, {...context, sidePanel:vm.runInNewContext(sidePanel, context)});
for (const view of ["2d","3d"]) {
  let panel, mobileOpen = false, nextFrame, focused = false, restored = false, sheet = "peek";
  const context = {view, compact:true, mobileOpen:false, preview:false, allowed3D:true,
    ui:{get sheet(){return sheet;}, setSheet:value=>{sheet=value;}},
    setPanel:value=>{panel=value;}, setMobileOpen:value=>{mobileOpen=value;}, setMoveMode:()=>{},
    document:{body:{style:{overflow:"auto"}},activeElement:{focus:()=>{restored=true;}}},
    closeRef:{current:{focus:()=>{focused=true;}}},
    requestAnimationFrame:fn=>{nextFrame=fn;return 1;}, cancelAnimationFrame:()=>{},
  };
  vm.runInNewContext(ts.transpile(`${open};open("shop")`),context);
  assert.equal(panel,"shop");
  context.mobileOpen = mobileOpen; context.panel = panel;
  assert.equal(resolvePanel(context),"shop",view+" shows the shopping list");
  if (view === "2d") {
    // The list stays a sheet beside the plan: opening it expands the sheet, and the page never locks.
    assert.equal(sheet,"full"); assert.equal(mobileOpen,false);
    for (const [key,value] of Object.entries({role:undefined,"aria-modal":undefined,inert:false})) assert.equal(vm.runInNewContext(attributes[key],context),value,view+" "+key);
    assert.equal(vm.runInNewContext(ts.transpile(`(${focus})()`),context),undefined);
    assert.equal(context.document.body.style.overflow,"auto"); assert(!focused);
  } else {
    assert.equal(mobileOpen,true); assert.equal(sheet,"peek");
    for (const [key,value] of Object.entries({role:"dialog","aria-modal":true,inert:false})) assert.equal(vm.runInNewContext(attributes[key],context),value,view+" "+key);
    const cleanup = vm.runInNewContext(ts.transpile(`(${focus})()`),context);
    assert.equal(context.document.body.style.overflow,"hidden"); nextFrame(); assert(focused);
    cleanup(); assert.equal(context.document.body.style.overflow,"auto"); assert(restored);
    context.mobileOpen=false; assert.equal(vm.runInNewContext(attributes.inert,context),true);
  }
  context.allowed3D=view==="3d";
  context.setView=()=>assert.fail("Opening controls must stay in the current view");
  vm.runInNewContext(ts.transpile(`${open};${editOpenings};editOpenings()`),context);
  context.panel=panel; context.mobileOpen=mobileOpen;
  if (view === "2d") assert.equal(sheet,"full"); else assert.equal(mobileOpen,true);
  // 2D shows the door and window tools in Room details; 3D keeps them in the Room panel.
  assert.equal(resolvePanel(context),view==="2d"?"room":"style","Opening controls are reachable in both views, including free 2D");
}
console.log("PASS: mobile cart opens as a sheet in 2D and a focused drawer in 3D that locks background scrolling and restores focus on close.");
console.log("PASS: door/window controls open in both views without switching views; wall drawing is a separate paid modal.");
