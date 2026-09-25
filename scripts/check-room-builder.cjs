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
// Old version-one drafts must restore without losing their walls or openings.
const legacy={...moved};delete legacy.closets;assert.deepEqual(B.parseBuilderDraft(legacy),moved);
const storage=valid(B.placeBuilderCloset(moved,{x:3,y:3},4,2));
assert.deepEqual(storage.closets,[{x_ft:1,y_ft:2,width_ft:4,depth_ft:2}]);
assert.equal(original.closets.length,0,'An edit must not mutate an undo snapshot');
assert.deepEqual(B.parseBuilderDraft(JSON.parse(JSON.stringify(storage))),storage);
const againstWall=valid(B.placeBuilderCloset(original,{x:7,y:6},4,2));
assert.deepEqual(againstWall.closets[0],{x_ft:3,y_ft:4,width_ft:4,depth_ft:2});
const resized=valid(B.editBuilderCloset(storage,{x_ft:-2.13,y_ft:1.27,width_ft:3.25,depth_ft:1.75},0));
assert.equal(resized.closets[0].x_ft,-2.13);assert.equal(resized.closets[0].width_ft,3.25);
const shifted=valid(B.placeBuilderCloset(storage,{x:-3,y:3},4,2,.5,0));
assert.equal(shifted.closets.length,1);assert.equal(shifted.closets[0].x_ft,-5);
const c=storage.closets[0],rotated=valid(B.editBuilderCloset(storage,{x_ft:c.x_ft+(c.width_ft-c.depth_ft)/2,y_ft:c.y_ft+(c.depth_ft-c.width_ft)/2,width_ft:c.depth_ft,depth_ft:c.width_ft},0));
assert.deepEqual(rotated.closets[0],{x_ft:2,y_ft:1,width_ft:2,depth_ft:4});
const touching=valid(B.editBuilderCloset(storage,{x_ft:5,y_ft:2,width_ft:2,depth_ft:2}));assert.equal(touching.closets.length,2);
for(const bad of [B.placeBuilderCloset(B.emptyDraft(),{x:0,y:0},4,2),B.placeBuilderCloset(storage,{x:3,y:3},4,2),B.placeBuilderCloset(storage,{x:20,y:3},4,2),B.placeBuilderCloset(B.presetDraft('l'),{x:5,y:5},2,2),B.editBuilderCloset(storage,{...c,width_ft:NaN},0),B.editBuilderCloset(storage,c,9),B.moveBuilderCorner(againstWall,2,{x:0,y:6})])assert.equal(typeof bad,'string');
const tooMany=Array.from({length:21},(_,i)=>({x_ft:-6+(i%7),y_ft:-5+Math.floor(i/7),width_ft:.5,depth_ft:.5}));
for(const closets of [null,{},[null],[[1,2]], [{...c,width_ft:0}],[{...c,depth_ft:21}],[{...c,x_ft:Infinity}],[{...c,y_ft:NaN}],[{...c,x_ft:6}],[c,c],tooMany])assert.equal(B.parseBuilderDraft({...original,closets}),null);
assert.equal(B.parseBuilderDraft({...storage,closed:false}),null);
assert.equal(B.parseBuilderDraft({...original,closets:tooMany.slice(0,20)}).closets.length,20);
const cleared={...storage,closets:[]};assert.equal(B.builderRoom(cleared).outline.closets.length,0);
assert.deepEqual(B.builderRoom(storage).outline.closets,[{x_ft:8,y_ft:8,width_ft:4,depth_ft:2}]);
for(const tier of ['free','flex','plus',null,undefined,'unknown'])assert.equal(P.canBuild3D({plan:tier,plus_features_unlocked:true}),false);
assert.equal(P.canBuild3D({plan:'pro'}),true);
console.log('PASS: custom outlines, openings, closet placement/movement/sizing/rotation, containment, overlaps, legacy drafts, and normalized coordinates.');

// Exercise the real pointer handlers with the shared geometry, without a GPU or live account.
const sceneSource=ts.createSourceFile('room-builder.js',fs.readFileSync(path.join(root,'public/experience/room-builder.js'),'utf8'),ts.ScriptTarget.Latest,true),gestures=[];
function collect(node){if(ts.isFunctionDeclaration(node)&&['down','move','up','cancel'].includes(node.name?.text))gestures.push(node.getText(sceneSource));ts.forEachChild(node,collect);}
collect(sceneSource);
let edits=0,placement=null;
const closetNode={position:{x:3,y:0,z:3,set(x,y,z){Object.assign(this,{x,y,z});}}};
const ctx={data:{draft:storage,tool:'select'},drag:null,pinch:0,pointers:new Map(),angle:.7,polar:.8,radius:30,view:'room',shell:{closets:[closetNode]},
  canvas:{focus(){},setPointerCapture(){},hasPointerCapture(){return false;}},clearGhost(){},request(){},updateSelection(){},
  picked:()=>({object:{userData:{kind:'closet',index:0}}}),pointer:e=>({x:e.x,z:e.z}),
  rebuild(){const c=ctx.data.draft.closets[0];closetNode.position.set(c.x_ft+c.width_ft/2,0,c.y_ft+c.depth_ft/2);},
  options:{onSelect(){},onPoint:p=>{placement=p;},previewCloset:(i,p)=>{const c=ctx.data.draft.closets[i],next=B.placeBuilderCloset(ctx.data.draft,p,c.width_ft,c.depth_ft,.5,i);return typeof next==='string'?null:next.closets[i];},onMoveCloset:(i,p)=>{const c=ctx.data.draft.closets[i],next=B.placeBuilderCloset(ctx.data.draft,p,c.width_ft,c.depth_ft,.5,i);if(typeof next!=='string'){edits++;ctx.data.draft=next;}}},
};
require('node:vm').runInNewContext(gestures.join('\n'),ctx);
const touch={pointerId:1,button:0,pointerType:'touch',clientX:0,clientY:0,x:4,z:3};
ctx.down(touch);ctx.move({...touch,clientX:40,clientY:20,x:0,z:3});
assert.equal(edits,0,'Dragging previews without creating undo entries');assert.equal(closetNode.position.x,-1,'The closet moves with the pointer and preserves its grab offset');assert.equal(ctx.angle,.7,'Dragging a closet must not orbit');
ctx.up(touch);assert.equal(edits,1);assert.equal(ctx.data.draft.closets[0].x_ft,-3);
ctx.down({...touch,x:0});ctx.move({...touch,clientX:40,clientY:20,x:2,z:3});ctx.cancel();ctx.up(touch);
assert.equal(edits,1,'Cancel must not commit a closet move');assert.equal(closetNode.position.x,-1,'Cancel restores the saved position');
ctx.down({...touch,x:0});ctx.move({...touch,clientX:40,clientY:20,x:40,z:3});ctx.up(touch);
assert.equal(edits,1,'Dropping outside the room leaves the closet in its original position');assert.equal(closetNode.position.x,-1);
ctx.data.tool='closet';ctx.down({...touch,x:1.13,z:-2.17});ctx.up({...touch,x:1.13,z:-2.17});
assert.equal(placement.x,1.13);assert.equal(placement.y,-2.17,'Placement and hover use the same unsnapped center');
console.log('PASS: touch closet dragging preserves grab offset, previews without history edits, commits once, and restores canceled/invalid drops.');

(async()=>{
  const {usePlannerStore:store}=load(path.join(root,'lib/store.ts'));
  const source={...storage,occupants:2,bedSize:'full',settings:{ceilingFt:9.25,floor:'walnut',wallColor:'#ece8df',lighting:'day'}};
  const room=B.builderRoom(source);store.getState().setCollege({id:'old',name:'Old school'});store.getState().setCollege(null);store.getState().setRoom(room);store.getState().setPlannerView('3d');store.getState().setStyle('cozy');store.getState().setBudget(650);
  const saved=JSON.parse(memory.get('dormscape-planner')).state;assert.equal(saved.plannerView,'3d');assert.equal(saved.college,null);assert.deepEqual(saved.room,room);assert.equal(saved.room.studio.ceilingFt,9.25);assert.equal(saved.room.occupants,2);assert.equal(saved.room.bedSize,'full');assert.deepEqual(saved.room.outline.openings,source.openings);
  assert.deepEqual(saved.room.outline.closets,[{x_ft:8,y_ft:8,width_ft:4,depth_ft:2}]);
  const geometry=load(path.join(root,'components/canvas/geometry.ts')),studio=load(path.join(root,'lib/studio.ts'));
  const desk={id:'desk-test',label:'Desk',type:'desk',x_ft:8.5,y_ft:8.5,width_ft:1,length_ft:1,rotation_deg:0,movable:true,built_in:true};
  assert(geometry.invalidItems([desk],room.lengthFt,room.widthFt,room.outline).has(desk.id),'2D must reserve the transferred closet space');
  assert(studio.placementIssues([desk],room,source.settings).some(i=>i.message==='Overlaps a fixed closet'),'3D must flag furniture overlapping transferred closets');
  const clearDesk={...desk,x_ft:5,y_ft:5};assert(!geometry.invalidItems([clearDesk],room.lengthFt,room.widthFt,room.outline).has(desk.id));
  console.log('PASS: closets survive style/budget handoff and persistence; both planner views recognize fixed storage obstacles.');
  const api=load(path.join(root,'app/api/room-builder/route.ts'));
  const request=d=>new Request('http://localhost/api/room-builder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  for(const tier of ['free','flex','plus']){plan=tier;assert.equal((await api.GET(new Request('http://localhost/api/room-builder'))).status,403);assert.equal((await api.POST(request(source))).status,403);}
  plan='pro';identity=null;assert.equal((await api.POST(request(source))).status,401);identity='test-user';profileFailure=true;assert.equal((await api.POST(request(source))).status,503);profileFailure=false;
  service=false;assert.equal((await api.GET(new Request('http://localhost/api/room-builder'))).status,503);service=true;
  limited=true;assert.equal((await api.POST(request(source))).status,429);limited=false;
  assert.equal((await api.POST(request({broken:true}))).status,400);assert.equal((await api.POST(request(B.emptyDraft()))).status,400);
  assert.equal((await api.POST(request({...source,closets:[{...c,width_ft:-1}]}))).status,400);
  assert.equal((await api.POST(request({...source,closets:[c,c]}))).status,400);
  assert.equal((await api.POST(new Request('http://localhost/api/room-builder',{method:'POST',body:'not JSON'}))).status,400);
  assert.equal((await api.POST(request({padding:'x'.repeat(25000)}))).status,413);
  const result=await api.POST(request(source));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.deepEqual((await result.json()).room,room);
  console.log('PASS: server denies Free, Flex, Plus, signed-out users, unavailable profiles, malformed geometry, oversize input, and rate limits; Pro receives the exact room.');

  const T=await import('../public/experience/vendor/three.module.min.js'),{createBuilderShell}=await import('../public/experience/room-builder.js');
  for(const shape of ['rectangle','l','alcove']){
    let draft=B.presetDraft(shape);draft=valid(B.placeBuilderOpening(draft,'door',{x:0,y:-6},3));draft=valid(B.placeBuilderOpening(draft,'window',{x:-7,y:0},3));draft=valid(B.placeBuilderCloset(draft,{x:0,y:-3},4,2));
    for(const ceilingFt of [6,8,16]){
      const shell=createBuilderShell({...draft,settings:{...draft.settings,ceilingFt}});shell.root.updateMatrixWorld(true);
      const floor=shell.root.getObjectByName('builder-floor'),box=new T.Box3().setFromObject(floor);close(box.max.y,0);close(box.min.y,-.2);assert.equal(shell.walls.length,draft.points.length);assert.equal(shell.openings.length,2);assert.equal(shell.corners.length,draft.points.length);
      assert(shell.root.getObjectByName('builder-door-leaf'));assert(shell.root.getObjectByName('builder-window-pane'));
      assert.equal(shell.closets.length,1);const closet=shell.closets[0],cb=new T.Box3().setFromObject(closet),c=draft.closets[0];
      close(cb.min.y,0);close(cb.max.y,ceilingFt*.87);close(cb.min.x,c.x_ft);close(cb.max.x,c.x_ft+c.width_ft);close(cb.min.z,c.y_ft);close(cb.max.z,c.y_ft+c.depth_ft);
      const pick=new T.Raycaster(new T.Vector3(c.x_ft+c.width_ft/2,ceilingFt+2,c.y_ft+c.depth_ft/2),new T.Vector3(0,-1,0));const hit=pick.intersectObject(closet,true)[0];assert(hit);assert.deepEqual(hit.object.userData,{kind:'closet',index:0});
      for(const node of shell.walls){const b=new T.Box3().setFromObject(node);close(b.max.y,ceilingFt);}
      const o=draft.openings[0],x=draft.points[0].x+o.offset_ft+o.width_ft/2;
      const ray=new T.Raycaster(new T.Vector3(x,4,-10),new T.Vector3(0,0,1));assert.equal(ray.intersectObjects(shell.walls[0].children,true).length,0,'Door must be an actual hole, not a decal on a solid wall');
      shell.dispose();
    }
  }
  console.log('PASS: actual Three.js meshes preserve floor height, openings, door holes, closet dimensions and selection at minimum/default/maximum ceiling heights.');
})().catch(error=>{console.error(error);process.exitCode=1;});
