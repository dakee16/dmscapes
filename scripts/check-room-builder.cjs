// Real construction geometry, planner handoff, and API authorization. No live account or billing writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),memory=new Map();
global.sessionStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let plan='pro',identity='test-user',service=true,profileFailure=false,limited=false;
const overrides={
  '@/lib/supabase-auth':{getUserId:async()=>identity},
  '@/lib/supabase-server':{getServiceClient:()=>service?{from:()=>({select:()=>({eq:()=>({single:async()=>profileFailure?{data:null,error:{message:'offline'}}:{data:{plan},error:null}})})})}:null},
  '@/lib/rate-limit':{rateLimit:()=>({allowed:!limited,retryAfterSec:60})},
};
function load(file){
  if(!path.extname(file))file+='.ts';if(file.endsWith('.json'))return require(file);if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports',code)(id=>overrides[id]??(id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id)),mod,mod.exports);return mod.exports;
}
const B=load(path.join(root,'lib/room-builder.ts')),P=load(path.join(root,'lib/plan.ts'));
const valid=value=>{assert.notEqual(typeof value,'string',String(value));return value;};
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
for(const shape of ['rectangle','l','alcove']){
  const d=B.presetDraft(shape);assert.equal(B.builderError(d),null);assert.deepEqual(B.parseBuilderDraft(JSON.parse(JSON.stringify(d))),d);
  const room=B.builderRoom(d);assert.equal(Math.min(...room.outline.points.map(p=>p.x)),0);assert.equal(Math.min(...room.outline.points.map(p=>p.y)),0);assert.equal(room.lengthFt,14);assert.equal(room.widthFt,12);
}
assert(B.builderError(B.emptyDraft()));
assert(B.pathError([{x:0,y:0},{x:5,y:0},{x:2,y:0}]));
assert(B.pathError([{x:0,y:0},{x:6,y:6},{x:0,y:6},{x:6,y:0}]));
const original=B.presetDraft('rectangle');
assert.equal(typeof B.moveBuilderCorner(original,0,{x:31,y:0}),'string');
assert.equal(typeof B.moveBuilderCorner(original,0,{x:7,y:6}),'string');
assert.equal(B.builderError({...original,points:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]}).includes('4 ft'),true);
const door=valid(B.placeBuilderOpening(original,'door',{x:0,y:-6},3));assert.equal(door.openings[0].edge,0);
const window=valid(B.placeBuilderOpening(door,'window',{x:7,y:2},4));assert.equal(window.openings[1].edge,1);
const moved=valid(B.placeBuilderOpening(window,'door',{x:-7,y:0},3,0));assert.equal(moved.openings[0].edge,3);
assert.equal(typeof B.placeBuilderOpening(moved,'door',{x:0,y:0},3),'string','Openings cannot float in the middle of a floor');
assert.equal(typeof B.placeBuilderOpening(moved,'door',{x:0,y:-6},99),'string');
assert.equal(typeof B.splitBuilderWall(door,0),'string','Splitting through an opening must be rejected');
const offsetDoor={...original,openings:[{kind:'door',edge:0,offset_ft:9,width_ft:3,swing:2}]};
const split=valid(B.splitBuilderWall(offsetDoor,0));assert.equal(split.points.length,5);assert.deepEqual(split.openings[0],{kind:'door',edge:1,offset_ft:2,width_ft:3,swing:2});
assert.equal(typeof B.removeBuilderCorner(split,1),'string','Removing a corner must not silently lose connected openings');
const splitBlank=valid(B.splitBuilderWall(original,2));assert.deepEqual(valid(B.removeBuilderCorner(splitBlank,3)),original);
const overlaps={...door,openings:[...door.openings,{...door.openings[0],kind:'window'}]};assert.equal(B.parseBuilderDraft(overlaps),null);
for(const bad of [null,{},[],{...original,version:2},{...original,occupants:0},{...original,occupants:1.5},{...original,settings:{...original.settings,ceilingFt:100}},{...original,points:[{x:NaN,y:0}]},{...original,points:original.points.map(p=>({...p,x:p.x+100}))},{...original,closed:false,openings:door.openings},{...door,openings:[{...door.openings[0],kind:'anything'}]}])assert.equal(B.parseBuilderDraft(bad),null);
assert.equal(B.parseBuilderDraft({...original,points:Array(41).fill({x:1,y:1})}),null);
for(const tier of ['free','flex','plus',null,undefined,'unknown'])assert.equal(P.canBuild3D({plan:tier,plus_features_unlocked:true}),false);
assert.equal(P.canBuild3D({plan:'pro'}),true);
console.log('PASS: custom outlines, presets, intersections, opening placement, wall splitting, precision edits, and draft validation.');

(async()=>{
  const {usePlannerStore:store}=load(path.join(root,'lib/store.ts'));
  const source={...moved,occupants:2,bedSize:'full',settings:{ceilingFt:9.25,floor:'walnut',wallColor:'#ece8df',lighting:'day'}};
  const room=B.builderRoom(source);store.getState().setCollege({id:'old',name:'Old school'});store.getState().setCollege(null);store.getState().setRoom(room);store.getState().setPlannerView('3d');store.getState().setStyle('cozy');store.getState().setBudget(650);
  const saved=JSON.parse(memory.get('dormscape-planner')).state;assert.equal(saved.plannerView,'3d');assert.equal(saved.college,null);assert.deepEqual(saved.room,room);assert.equal(saved.room.studio.ceilingFt,9.25);assert.equal(saved.room.occupants,2);assert.equal(saved.room.bedSize,'full');assert.deepEqual(saved.room.outline.openings,source.openings);
  // The integration persists the exact normalized outline; furniture fitting is tested by the existing studio suite.
  console.log('PASS: custom room, openings, finishes, occupancy, mattress size, and 3D intent survive the style/budget handoff and session persistence.');
  const api=load(path.join(root,'app/api/room-builder/route.ts'));
  const request=d=>new Request('http://localhost/api/room-builder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  for(const tier of ['free','flex','plus']){plan=tier;assert.equal((await api.GET(new Request('http://localhost/api/room-builder'))).status,403);assert.equal((await api.POST(request(source))).status,403);}
  plan='pro';identity=null;assert.equal((await api.POST(request(source))).status,401);identity='test-user';profileFailure=true;assert.equal((await api.POST(request(source))).status,503);profileFailure=false;
  service=false;assert.equal((await api.GET(new Request('http://localhost/api/room-builder'))).status,503);service=true;
  limited=true;assert.equal((await api.POST(request(source))).status,429);limited=false;
  assert.equal((await api.POST(request({broken:true}))).status,400);assert.equal((await api.POST(request(B.emptyDraft()))).status,400);
  assert.equal((await api.POST(new Request('http://localhost/api/room-builder',{method:'POST',body:'not JSON'}))).status,400);
  assert.equal((await api.POST(request({padding:'x'.repeat(25000)}))).status,413);
  const result=await api.POST(request(source));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.deepEqual((await result.json()).room,room);
  console.log('PASS: server denies Free, Flex, Plus, signed-out users, unavailable profiles, malformed geometry, oversize input, and rate limits; Pro receives the exact room.');

  const T=await import('../public/experience/vendor/three.module.min.js'),{createBuilderShell}=await import('../public/experience/room-builder.js');
  for(const shape of ['rectangle','l','alcove']){
    let draft=B.presetDraft(shape);draft=valid(B.placeBuilderOpening(draft,'door',{x:0,y:-6},3));draft=valid(B.placeBuilderOpening(draft,'window',{x:-7,y:0},3));
    for(const ceilingFt of [6,8,16]){
      const shell=createBuilderShell({...draft,settings:{...draft.settings,ceilingFt}});shell.root.updateMatrixWorld(true);
      const floor=shell.root.getObjectByName('builder-floor'),box=new T.Box3().setFromObject(floor);close(box.max.y,0);close(box.min.y,-.2);assert.equal(shell.walls.length,draft.points.length);assert.equal(shell.openings.length,2);assert.equal(shell.corners.length,draft.points.length);
      assert(shell.root.getObjectByName('builder-door-leaf'));assert(shell.root.getObjectByName('builder-window-pane'));
      for(const node of shell.walls){const b=new T.Box3().setFromObject(node);close(b.max.y,ceilingFt);}
      const o=draft.openings[0],x=draft.points[0].x+o.offset_ft+o.width_ft/2;
      const ray=new T.Raycaster(new T.Vector3(x,4,-10),new T.Vector3(0,0,1));assert.equal(ray.intersectObjects(shell.walls[0].children,true).length,0,'Door must be an actual hole, not a decal on a solid wall');
      shell.dispose();
    }
  }
  console.log('PASS: actual Three.js room meshes preserve floor height, wall dimensions, openings, and door holes at minimum/default/maximum ceiling heights.');
})().catch(error=>{console.error(error);process.exitCode=1;});
