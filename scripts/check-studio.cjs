// Run with Node 22: node scripts/check-studio.cjs
// Tests production geometry, persistence validation, and shared store actions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, ".."), cache = new Map();
const memory = new Map();
global.sessionStorage = {getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
function load(file) {
  if (!path.extname(file)) file += ".ts";
  if (file.endsWith(".json")) return require(file);
  if (file.endsWith(".module.css")) return {};
  if (cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}}; cache.set(file,module);
  const code = ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{esModuleInterop:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function("require","module","exports",code)(id=>id.startsWith("@/")?load(path.join(root,id.slice(2))):id.startsWith(".")?load(path.resolve(path.dirname(file),id)):require(id),module,module.exports);
  return module.exports;
}
const studio=load(path.join(root,"lib/studio.ts"));
const save=load(path.join(root,"lib/studio-save.ts"));
const {usePlannerStore:store}=load(path.join(root,"lib/store.ts"));
assert.equal(store.getState().plannerView,"2d");
store.getState().setPlannerView("3d");
store.getState().setCollege({id:null,name:"Preview test"});
store.getState().setStyle("minimalist");
assert.equal(store.getState().plannerView,"3d","Room and vibe selection must preserve 3D intent");
assert.equal(JSON.parse(memory.get("dormscape-planner")).state.plannerView,"3d","3D intent must survive the login round trip");
store.getState().resetPlanner();
assert.equal(store.getState().plannerView,"2d");
const room={type:"double",occupants:2,lengthFt:15,widthFt:12,source:"manual"};
const item={id:"desk",type:"desk",label:"Desk",x_ft:2,y_ft:2,width_ft:4,length_ft:2,rotation_deg:0,movable:true,built_in:true};
assert.deepEqual(studio.roomOutline(room).openings,[],"Unknown doors must not be invented");
assert.deepEqual(studio.constrainedPosition(item,100,-1,room,false),{x:11,y:0});
assert.deepEqual(studio.constrainedPosition(item,2.2,3.8,room,true),{x:2,y:4});
const irregular={...room,lengthFt:10,widthFt:10,outline:{points:[{x:0,y:0},{x:10,y:0},{x:10,y:4},{x:4,y:4},{x:4,y:10},{x:0,y:10}],openings:[],closets:[]}};
const small={...item,width_ft:2,length_ft:2,x_ft:1,y_ft:1};
assert.deepEqual(studio.constrainedPosition(small,6,6,irregular,false),{x:1,y:1},"Concave cutout is not usable floor");
assert.equal(studio.visibleFurniture([item],["desk"],[]).length,0);
assert.equal(studio.visibleFurniture([item],[],["desk_accessories"]).length,1,"Dorm-provided furniture stays visible");
const lamp={...small,id:"lamp",type:"desk_lamp",label:"Lamp",width_ft:.5,length_ft:.5,x_ft:2.5,y_ft:2.5,parent_id:"desk",elevation_ft:2.5};
assert.equal(studio.placementIssues([item,lamp],room,studio.DEFAULT_STUDIO).filter(x=>x.message.startsWith("Overlaps")).length,0,"Surface-mounted accessories must not collide with their host");
store.setState({room,furniture:[item,lamp],lockedItemIds:[],hiddenItemIds:[]});
store.getState().moveItem("desk",3,3);
assert.equal(store.getState().furniture[1].x_ft,3.5);
store.getState().updateItem3D("desk",{height_ft:3});
assert.equal(store.getState().furniture[1].elevation_ft,3,"Accessories follow a resized surface");
store.setState({furniture:[item,lamp]});
store.getState().rotateItem("desk",1);
assert.equal(store.getState().furniture[1].x_ft,4);
assert.equal(store.getState().furniture[1].y_ft,1.5);
for(let i=0;i<3;i++)store.getState().rotateItem("desk",1);
assert.equal(store.getState().furniture[1].x_ft,2.5);
assert.equal(store.getState().furniture[1].y_ft,2.5);
store.setState({lockedItemIds:["desk"]});
const locked=JSON.stringify(store.getState().furniture);
store.getState().moveItem("desk",9,9);store.getState().rotateItem("desk",1);
assert.equal(JSON.stringify(store.getState().furniture),locked,"Locked furniture cannot move or rotate");
const geometry=load(path.join(root,"components/canvas/geometry.ts"));
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-9,message??`${a} should equal ${b}`);
const center=f=>{const b=geometry.footprint(f);return {x:b.x+b.w/2,y:b.y+b.h/2};};
store.setState({furniture:[item,lamp],lockedItemIds:[]});
store.getState().setItemRotation("desk",32.5);
const angled=store.getState().furniture[0],accessory=store.getState().furniture[1];
near(angled.rotation_deg,32.5);near(accessory.rotation_deg,32.5);
near(center(angled).x,center(item).x,"Rotation preserves the center without grid snapping");
near(center(angled).y,center(item).y);
near(Math.hypot(center(accessory).x-center(angled).x,center(accessory).y-center(angled).y),
  Math.hypot(center(lamp).x-center(item).x,center(lamp).y-center(item).y),"Accessories orbit with their host");
near(JSON.parse(memory.get("dormscape-planner")).state.furniture[0].rotation_deg,32.5,"Arbitrary angles persist");
store.getState().setItemRotation("desk",-15.25);
near(store.getState().furniture[0].rotation_deg,344.75);
store.getState().setItemRotation("desk",720);
for(const f of store.getState().furniture){const original=f.id===item.id?item:lamp;near(f.x_ft,original.x_ft);near(f.y_ft,original.y_ft);near(f.rotation_deg,0);}
const unchanged=store.getState().furniture;
for(const invalid of [NaN,Infinity,-Infinity])store.getState().setItemRotation("desk",invalid);
assert.equal(store.getState().furniture,unchanged,"Invalid angles leave the layout untouched");
store.setState({lockedItemIds:["desk"]});store.getState().setItemRotation("desk",23);
assert.equal(store.getState().furniture,unchanged,"Exact angles respect locks too");
store.setState({lockedItemIds:[],furniture:[{...item,movable:false}]});
store.getState().setItemRotation("desk",23);
assert.equal(store.getState().furniture[0].rotation_deg,0,"Fixed fixtures cannot rotate");

const diagonalRoom={...room,lengthFt:12,widthFt:12,outline:{points:[{x:0,y:0},{x:12,y:0},{x:12,y:12}],openings:[],closets:[]}};
const diagonal={...item,width_ft:6,length_ft:1.5,rotation_deg:45};
const bounds=geometry.footprint(diagonal);
diagonal.x_ft=6-bounds.w/2;diagonal.y_ft=6-1.5/Math.SQRT2-bounds.h/2;
assert(!geometry.rectInsidePolygon(geometry.footprint(diagonal),diagonalRoom.outline.points),"Fixture must exercise the false-positive bounding box case");
assert(geometry.furnitureInsidePolygon(diagonal,diagonalRoom.outline.points),"Furniture can sit flush against a diagonal wall");
assert.equal(geometry.invalidItems([diagonal],12,12,diagonalRoom.outline).size,0);
assert.equal(studio.placementIssues([diagonal],diagonalRoom,studio.DEFAULT_STUDIO).length,0,"2D and 3D fit checks agree");
assert(geometry.invalidItems([{...diagonal,y_ft:diagonal.y_ft+.01}],12,12,diagonalRoom.outline).has(item.id),"Real wall crossings are still flagged");
const beside={...diagonal,id:"beside",x_ft:diagonal.x_ft-1.6/Math.SQRT2,y_ft:diagonal.y_ft+1.6/Math.SQRT2};
assert.equal(geometry.invalidItems([diagonal,beside],15,15).size,0,"Overlapping bounds alone are not a collision");
assert.equal(geometry.invalidItems([diagonal,{...beside,x_ft:diagonal.x_ft-.5,y_ft:diagonal.y_ft+.5}],15,15).size,2,"Angled furniture collisions are detected");
const closet={x_ft:diagonal.x_ft,y_ft:diagonal.y_ft,width_ft:.2,depth_ft:.2};
assert.equal(geometry.invalidItems([diagonal],15,15,{points:studio.roomOutline(room).points,closets:[closet]}).size,0,"Empty corners of rotated bounds do not collide with closets");
const notch=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:6,y:10},{x:6,y:4},{x:4,y:4},{x:4,y:10},{x:0,y:10}];
const overNotch={...item,x_ft:1,y_ft:4,width_ft:8,length_ft:2};
assert(geometry.furnitureCorners(overNotch).every(p=>geometry.pointInPolygon(p.x,p.y,notch)));
assert(!geometry.furnitureInsidePolygon(overNotch,notch),"Concave walls cannot cut through furniture even when every corner fits");
console.log("PASS: arbitrary angles, center preservation, attachments, persistence, locks, diagonal walls, and oriented collisions.");
assert.equal(save.sanitizeStudio({...studio.DEFAULT_STUDIO,wallColor:"url(javascript:alert(1))"}),null);
assert.equal(save.sanitizeItem3D({height_ft:NaN}),null);
assert.equal(save.sanitizeItem3D({elevation_ft:-1}),null);
const base={hiddenItemIds:[],lockedItemIds:[],excluded:[],customItems:[],unplacedItemIds:[],customProducts:null,customVibe:null,customMock:false,customRegenUsed:false,cartProducts:[]};
const catalog=require(path.join(root,"data/product-catalog.json"));
for(let i=0;i<catalog.length;i+=50)assert(save.sanitizeEditor({...base,cartProducts:catalog.slice(i,i+50)}),"Catalog save validation at "+i);
assert.equal(save.sanitizeEditor({...base,cartProducts:[{...catalog[0],affiliate_url:"https://amazon.com.evil.example/item"}]}),null);
assert.equal(save.sanitizeEditor({...base,cartProducts:[{...catalog[0],image_url:"javascript:alert(1)"}]}),null);
if(process.argv[2]){const request=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));assert(save.sanitizeStudio(request.room_dimensions.studio));assert(save.sanitizeEditor(request.room_dimensions.editor));assert.equal(request.room_dimensions.studio.floor,"walnut");assert.equal(request.room_dimensions.outline.openings.length,2);}
console.log("PASS: room bounds, concave rooms, visibility, attachment movement/rotation, locks, catalog and saved-state validation.");

const {canUse3D}=load(path.join(root,"lib/plan.ts"));
for(const profile of [null,undefined,{plan:"free"},{plan:"flex"},{plan:"plus"},{plan:"unknown"},{plan:"plus",plus_features_unlocked:true}])assert.equal(canUse3D(profile),false);
assert.equal(canUse3D({plan:"pro"}),true);
console.log("PASS: interactive 3D entitlement is exclusive to Pro.");

const {roomEditError,openingAtPoint,openingCenter}=load(path.join(root,"lib/room-editing.ts"));
const plainOutline=studio.roomOutline(room);
const snappedDoor=openingAtPoint(plainOutline,"door",{x:7.5,y:.2});
assert.deepEqual(snappedDoor,{kind:"door",width_ft:3,edge:0,offset_ft:6});
assert.deepEqual(openingCenter(plainOutline.points,snappedDoor),{x:7.5,y:0});
const withDoor={...plainOutline,openings:[snappedDoor]};
const snappedWindow=openingAtPoint(withDoor,"window",{x:7.5,y:0});
assert.equal(roomEditError({...withDoor,openings:[snappedDoor,snappedWindow]}),null,"Drops snap into available space without overlapping");
assert.equal(snappedWindow.width_ft,4);
const movedDoor=openingAtPoint(withDoor,{...snappedDoor,swing:3},{x:15,y:8},0);
assert.deepEqual(movedDoor,{kind:"door",width_ft:3,edge:1,offset_ft:6.5,swing:3},"Drag can move to a different wall while retaining size and swing");
assert.equal(openingAtPoint(plainOutline,"door",{x:7,y:6}),null,"Dropping in the middle of the room cancels placement");
assert.equal(openingAtPoint(plainOutline,"door",{x:NaN,y:0}),null);
const fullWall={...plainOutline,openings:[{kind:"window",edge:0,offset_ft:0,width_ft:15}]};
assert.equal(openingAtPoint(fullWall,"door",{x:7,y:0}),null,"A full wall rejects the drop");
assert.equal(openingAtPoint(fullWall,"door").edge,1,"Tap-to-add finds another wall automatically");
const shortOutline={points:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],openings:[],closets:[]};
assert.equal(openingAtPoint(shortOutline,"door"),null,"Standard openings do not shrink to fit short walls");
for(const target of [irregular,diagonalRoom]){
  const snapped=openingAtPoint(target.outline,"door");
  const moved=openingAtPoint({...target.outline,openings:[snapped]},snapped,openingCenter(target.outline.points,snapped),0);
  assert.equal(roomEditError({...target.outline,openings:[moved]}),null,"Snapping supports concave and diagonal outlines");
}
console.log("PASS: drag placement snaps to free wall space, preserves size/swing, supports irregular rooms, and rejects invalid drops.");
// Run the actual 3D gesture handlers against the shared snapping logic.
const sceneSource=ts.createSourceFile("studio-scene.js",fs.readFileSync(path.join(root,"public/experience/studio-scene.js"),"utf8"),ts.ScriptTarget.Latest,true);
const gestureFunctions=[];
function collectGestures(node){
  if(ts.isFunctionDeclaration(node)&&["down","distance","move","up","cancelDrag","positionOpening"].includes(node.name?.text))gestureFunctions.push(node.getText(sceneSource));
  ts.forEachChild(node,collectGestures);
}
collectGestures(sceneSource);
let openingCommits=0;
const openingNode={position:{set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{y:0}};
const gestureContext={data:{editOpenings:true,outline:withDoor},drag:null,pointers:new Map(),pinch:0,assemblyStart:0,angle:.7,polar:.94,
  meshes:new Map(),openingNodes:new Map([[0,openingNode]]),openingGhost:{visible:false},clearGuides(){},request(){},
  canvas:{focus(){},setPointerCapture(){},hasPointerCapture(){return false;}},
  openingHit:()=>({object:{userData:{openingIndex:0}},point:{y:3}}),wallPoint:e=>({x:e.x,z:e.y}),
  options:{onSelectOpening(){},previewOpening:(i,x,y)=>openingAtPoint(withDoor,withDoor.openings[i],{x,y},i),onOpeningChange:(i,o)=>{openingCommits++;assert.equal(i,0);assert.equal(o.edge,1);}},
};
require("node:vm").runInNewContext(gestureFunctions.join("\n"),gestureContext);
const pointer={pointerId:1,button:0,pointerType:"touch",clientX:0,clientY:0};
gestureContext.down(pointer);
gestureContext.move({...pointer,clientX:30,clientY:20,x:15,y:8});
assert.equal(openingCommits,0,"Dragging only previews the opening");
assert.equal(gestureContext.drag.nextOpening.edge,1);
assert.equal(gestureContext.angle,.7,"Dragging an opening cannot orbit the room");
gestureContext.up(pointer);assert.equal(openingCommits,1,"One completed touch gesture makes one history edit");
gestureContext.down(pointer);gestureContext.move({...pointer,clientX:30,clientY:20,x:15,y:8});gestureContext.cancelDrag();gestureContext.up(pointer);
assert.equal(openingCommits,1,"Cancel restores the original opening without committing");
gestureContext.down(pointer);gestureContext.move({...pointer,clientX:30,clientY:20,x:7,y:6});gestureContext.up(pointer);
assert.equal(openingCommits,1,"An invalid drop does not alter the room");
assert.equal(openingNode.position.x,0);assert.equal(openingNode.position.z,0);
console.log("PASS: 3D touch dragging previews without orbiting, commits once, and safely cancels invalid drops.");
const edited={points:[{x:0,y:0},{x:18,y:0},{x:18,y:12},{x:0,y:12}],openings:[{kind:"door",edge:0,offset_ft:2,width_ft:3},{kind:"window",edge:1,offset_ft:4,width_ft:4}],closets:[]};
assert.equal(roomEditError(edited),null);
assert(roomEditError({...edited,points:[{x:0,y:0},{x:18,y:12},{x:18,y:0},{x:0,y:12}]}),"Crossed walls must be rejected");
assert(roomEditError({...edited,openings:[{kind:"door",edge:0,offset_ft:17,width_ft:3}]}),"An opening must fit on its wall");
assert(roomEditError({...edited,openings:[...edited.openings,{kind:"window",edge:0,offset_ft:3,width_ft:3}]}),"Openings must not overlap");
assert(roomEditError({...edited,closets:[{x_ft:17,y_ft:2,width_ft:2,depth_ft:2}]}),"Walls must not strand closets outside");
store.setState({room,furniture:[item,lamp],budget:500,swaps:{rug:"qa-product"},lockedItemIds:["desk"],excluded:["wall_art"],customVibe:"unchanged"});
store.getState().updateRoomGeometry(edited);
assert.equal(store.getState().room.lengthFt,18);
assert.deepEqual(store.getState().furniture,[item,lamp],"Wall edits must keep the furniture arrangement");
assert.equal(store.getState().budget,500);assert.deepEqual(store.getState().swaps,{rug:"qa-product"});assert.deepEqual(store.getState().excluded,["wall_art"]);assert.equal(store.getState().customVibe,"unchanged");
store.getState().updateRoomGeometry(edited,{x:1,y:1});
assert.equal(store.getState().furniture[0].x_ft,item.x_ft-1);assert.equal(store.getState().furniture[1].x_ft,lamp.x_ft-1,"Origin normalization keeps attachments aligned");
const committed=store.getState().room;
store.getState().updateRoomGeometry({...edited,openings:[{kind:"door",edge:8,offset_ft:0,width_ft:3}]});
assert.equal(store.getState().room,committed,"Invalid geometry must not change the stored design");
console.log("PASS: room editing validation, geometry updates, furniture and cart preservation, and origin translation.");

for(const original of [{...room,source:"catalog",dimsEstimated:true},{...irregular,source:"drawn",outline:{...irregular.outline,closets:[{x_ft:0,y_ft:5,width_ft:2,depth_ft:2}]}}]){
  store.setState({room:original,furniture:[item,lamp],plannerView:"3d"});
  const outline=studio.roomOutline(original),openings=[{kind:"door",edge:0,offset_ft:1,width_ft:3,swing:0},{kind:"window",edge:1,offset_ft:0,width_ft:4}];
  assert.equal(store.getState().updateOpenings(openings),null);
  assert.deepEqual(store.getState().room,{...original,outline:{...outline,openings}},"Openings cannot alter walls, dimensions, closets, or room metadata");
  assert.deepEqual(store.getState().furniture,[item,lamp]);
  assert.equal(store.getState().plannerView,"3d","Editing openings preserves the current view");
  assert.deepEqual(JSON.parse(memory.get("dormscape-planner")).state.room.outline.openings,openings);
  const moved=[{...openings[0],offset_ft:2,width_ft:2.5,swing:3},openings[1]];
  assert.equal(store.getState().updateOpenings(moved),null);
  const validRoom=store.getState().room;
  for(const invalid of [
    [{...openings[0],edge:99}], [{...openings[0],offset_ft:NaN}], [{...openings[0],width_ft:-1}],
    [{...openings[0],offset_ft:original.lengthFt}], [openings[0],{...openings[0],kind:"window"}],
    Array.from({length:21},()=>openings[0]),
  ]){
    assert(store.getState().updateOpenings(invalid),"Invalid openings return an error");
    assert.equal(store.getState().room,validRoom,"Invalid edits leave the room untouched");
  }
  assert.equal(store.getState().updateOpenings([]),null);
  assert.deepEqual(store.getState().room,{...original,outline},"Removing openings preserves the original room");
}
console.log("PASS: openings add, edit, remove, persist, and validate without changing walls, dimensions, closets, furniture, or view.");
const {NumberField,RoomDetails}=load(path.join(root,"components/studio/StudioPanels.tsx"));
for(const [entered,accept,expected] of [[4,true,"4"],[4,false,"3"],[99,true,"3"],[NaN,true,"3"]]){
  let calls=0;
  const field=NumberField({label:"Opening width",value:3,min:.5,max:10,onCommit:()=>{calls++;return accept;}});
  const input={valueAsNumber:entered,value:String(entered)};
  field.props.children[1].props.onBlur({currentTarget:input});
  assert.equal(input.value,expected,"Rejected opening edits restore the committed measurement");
  assert.equal(calls,Number(Number.isFinite(entered)&&entered<=10));
}

const {matchTemplate}=load(path.join(root,"templates/template-matcher.ts"));
const {fitTemplateToRoom,layoutPenalty}=load(path.join(root,"lib/layout-fit.ts"));
const {isBunkBed,bedLabel}=load(path.join(root,"lib/bedding.ts"));
const {syncProductFurniture,productVisual}=load(path.join(root,"lib/product-model.ts"));
const {productsFor}=load(path.join(root,"lib/catalog.ts"));
const {invalidItems}=load(path.join(root,"components/canvas/geometry.ts"));
for(const [occupants,lengthFt,widthFt,expectedBunks] of [[3,13,12,1],[3,17,16,0],[3,27,14,0],[4,15,13,2],[4,25,17,0],[4,33,14,0],[4,17,25,0]]){
  const room={type:"suite",occupants,lengthFt,widthFt,source:"manual"};
  const match=matchTemplate({length_ft:lengthFt,width_ft:widthFt,occupants,room_type:room.type});
  const items=fitTemplateToRoom(match.template.furniture,match.template_id,lengthFt,widthFt);
  const beds=items.filter(f=>f.type==="bed");
  assert.equal(beds.reduce((n,f)=>n+(isBunkBed(f)?2:1),0),occupants,"Every occupant needs a sleeping space");
  assert.equal(beds.filter(isBunkBed).length,expectedBunks,`Bed configuration for ${occupants} / ${lengthFt}×${widthFt}`);
  assert(layoutPenalty(items,lengthFt,widthFt)<10,"Layout must fit without overlapping furniture");
  for(const bed of beds.filter(isBunkBed)){assert.equal(studio.modelKind(bed),"bunk");assert.match(bedLabel(bed),/2 beds/);}
  const products=productsFor("minimalist","mid");
  const synced=syncProductFurniture(items,products,room);
  assert.equal(syncProductFurniture(synced,products,room),synced,"Product synchronization must stabilize");
  assert(layoutPenalty(synced,lengthFt,widthFt)<15,"Actual product sizes must not introduce floor collisions");
  assert(synced.some(f=>f.product_category==="curtains"),"Cart curtains must appear");
  const accessory=synced.find(f=>f.product_category==="desk_accessories");assert(accessory?.parent_id,"Desk accessories must sit on a surface");
  const rug=synced.find(f=>f.type==="rug");assert.equal(rug.width_ft,products.find(p=>p.category==="rug").width_ft);
  assert.deepEqual(synced.filter(f=>f.built_in),items.filter(f=>f.built_in),"Shopping for bedding must not resize the provided bed");
  const edited=synced.map(f=>f.id===rug.id?{...f,width_ft:3.8,x_ft:1}:f);
  assert.equal(syncProductFurniture(edited,products,room),edited,"Manual sizes and positions survive rerenders");
}
const testProduct={...catalog[0],category:"desk_lamp",name:"Green glass bankers lamp",description:"",color:"green"};
assert.equal(productVisual(testProduct).variant,"banker");
assert.equal(productVisual({...testProduct,name:"Pink mushroom lamp"}).variant,"mushroom");
assert.equal(productVisual({...testProduct,category:"wall_decor",name:"Floating shelves"}).kind,"wall-shelf");
assert.equal(productVisual({...testProduct,category:"throw",name:"Cotton knitted throw blanket"}).kind,"blanket");
assert(invalidItems([{...item,id:"bed",type:"bed",width_ft:7,length_ft:3}, {...item,id:"overlapping-desk",x_ft:3,y_ft:2.5}],15,12).size>0,"A desk overlapping a bed is not a rider");
console.log("PASS: triple/quad capacity and clearance, portrait layouts, legacy bunks, cart dimensions, missing categories, and product variants.");

// Render the real drawing UI without a browser canvas to check progressive disclosure.
const drawFile=path.join(root,"components/planner/RoomDrawCanvas.tsx"),drawModule={exports:{}};
const drawCode=ts.transpileModule(fs.readFileSync(drawFile,"utf8"),{compilerOptions:{esModuleInterop:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function("require","module","exports",drawCode)(id=>{
  if(id==="react-konva"||id==="konva"||id.endsWith(".module.css"))return {};
  return id.startsWith("@/")?load(path.join(root,id.slice(2))):require(id);
},drawModule,drawModule.exports);
const {createElement}=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const openingHTML=renderToStaticMarkup(createElement(RoomDetails,{room:{...room,outline:withDoor},controls:{selected:0,select:()=>{}},onAdd:()=>{},onRemove:()=>{},onFlip:()=>{}}));
assert.equal((openingHTML.match(/draggable="true"/g)||[]).length,2,"Door and window cards support native drag and drop");
assert.doesNotMatch(openingHTML,/<input|<select|offset|Ceiling height|Opening.*width/,"Opening tools have no measurement or wall selection form");
assert.match(openingHTML,/Flip door/);assert.match(openingHTML,/Remove/);
const drawHTML=props=>renderToStaticMarkup(createElement(drawModule.exports.default,{onComplete:()=>{},...props}));
const freshDrawing=drawHTML({});
assert.match(freshDrawing,/tabindex="0" role="region" aria-label="Room drawing canvas"/,"A new room opens directly on the drawing canvas");
assert.match(freshDrawing,/aria-label="Drawing tools"/);
assert.match(freshDrawing,/Start at any corner\./);
assert.doesNotMatch(freshDrawing,/What shape is your room|Length \(ft\)|Width \(ft\)|Rectangle|L-shape|Choose a shape|Choose my vibe|Exact measurements/,"No shape questionnaire or premature detail controls");
assert.match(freshDrawing,/<details><summary>More tools &amp; tips<\/summary>/,"Extra tools still start collapsed");
const existingDrawing=drawHTML({initialRoom:room,onCancel:()=>{}});
assert.doesNotMatch(existingDrawing,/What shape is your room\?/,"Existing rooms open directly for editing");
for(const label of ["Shape","Door","Window","Closet","Apply room changes","Cancel edits"])assert(existingDrawing.includes(label));
assert.match(existingDrawing,/<details><summary>Exact measurements<\/summary>/,"Precision fields start collapsed");
assert.match(existingDrawing,/<details><summary>More tools &amp; tips<\/summary>/,"Extra tools and keyboard tips start collapsed");
console.log("PASS: drawing opens directly on the canvas; existing rooms keep editing tools, with precision and extra controls collapsed.");
