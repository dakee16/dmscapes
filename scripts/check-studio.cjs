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
  if (cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}}; cache.set(file,module);
  const code = ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function("require","module","exports",code)(id=>id.startsWith("@/")?load(path.join(root,id.slice(2))):id.startsWith(".")?load(path.resolve(path.dirname(file),id)):require(id),module,module.exports);
  return module.exports;
}
const studio=load(path.join(root,"lib/studio.ts"));
const save=load(path.join(root,"lib/studio-save.ts"));
const {usePlannerStore:store}=load(path.join(root,"lib/store.ts"));
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

const {roomEditError}=load(path.join(root,"lib/room-editing.ts"));
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

