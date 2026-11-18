// Real route boundaries and signed grants, with isolated database/provider transport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const sdk=require('livekit-server-sdk'),root=path.join(__dirname,'..'),cache=new Map();
const actor='11111111-1111-4111-8111-111111111111',room='22222222-2222-4222-8222-222222222222',epoch='33333333-3333-4333-8333-333333333333';
let user=actor,member=true,role='owner',pro=true,shared=true,currentEpoch=epoch,voiceAllowed=true,closeFailure=null,createFailure=false,removeDuringJoin=false,events=[];
const config={LIVEKIT_URL:'wss://voice.example.test',LIVEKIT_API_KEY:'test-key',LIVEKIT_API_SECRET:'isolated-test-secret-not-production'};
Object.assign(process.env,config);
const db={from(table){const q={select(){return q;},eq(){return q;},single(){return q;},maybeSingle(){return q;},then(resolve,reject){
 const data=table==='workspace_members'?(member?{role}:null):table==='room_workspaces'?{id:room,owner_id:actor,shared,realtime_epoch:currentEpoch}:table==='profiles'?{plan:pro?'pro':'free',username:'Jamie',full_name:'Jamie Test'}:null;
 return Promise.resolve({data,error:null}).then(resolve,reject);
}};return q;},async rpc(name,payload){events.push({kind:'mutation',name,payload});return {data:{ok:true},error:null};}};
class MockRoomService {
 constructor(url,key,secret,options){assert.equal(url,'https://voice.example.test');assert.equal(key,config.LIVEKIT_API_KEY);assert.equal(secret,config.LIVEKIT_API_SECRET);assert.equal(options.requestTimeout,8);}
 async createRoom(options){events.push({kind:'create',options});if(createFailure)throw Error('provider unavailable');if(removeDuringJoin)member=false;return options;}
 async deleteRoom(name){events.push({kind:'close',name});if(closeFailure)throw closeFailure;}
}
function load(file){if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='livekit-server-sdk')return {...sdk,RoomServiceClient:MockRoomService};
  if(id.endsWith('supabase-server'))return {getServiceClient:()=>db};
  if(id.endsWith('supabase-auth'))return {getUserId:async()=>user};
  if(id.endsWith('rate-limit'))return {rateLimit:(_r,key)=>({allowed:!key.startsWith('workspace-voice-')||voiceAllowed})};
  if(id.endsWith('workspace-invitation'))return {inviteRoommate:()=>{throw Error('unexpected invitation');}};
  return id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);
 },m,m.exports);return m.exports;
}
const voice=load(path.join(root,'app/api/workspaces/[id]/voice/route.ts')),one=load(path.join(root,'app/api/workspaces/[id]/route.ts')),helper=load(path.join(root,'lib/workspace-voice.ts')),protocol=load(path.join(root,'lib/workspace-collaboration.ts'));
const request=(method='GET',body)=>new Request('https://dormscape.test/api/workspaces/'+room+'/voice',{method,...(body?{body:JSON.stringify(body)}:{})}),context={params:Promise.resolve({id:room})};
let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++;};
(async()=>{
 user=null;eq((await voice.GET(request(),context)).status,401);eq((await voice.POST(request('POST'),context)).status,401);eq(events.length,0);user=actor;
 eq((await voice.POST(request('POST'),{params:Promise.resolve({id:'invalid'})})).status,404);
 member=false;eq((await voice.POST(request('POST'),context)).status,404);member=true;
 pro=false;eq((await voice.POST(request('POST'),context)).status,403);pro=true;
 shared=false;eq((await voice.POST(request('POST'),context)).status,403);shared=true;eq(events.length,0);
 delete process.env.LIVEKIT_API_SECRET;eq((await(await voice.GET(request(),context)).json()).available,false);eq((await voice.POST(request('POST'),context)).status,503);Object.assign(process.env,config);
 currentEpoch=undefined;eq((await(await voice.GET(request(),context)).json()).available,false);eq((await voice.POST(request('POST'),context)).status,503);currentEpoch=epoch;
 process.env.LIVEKIT_URL='https://voice.example.test';eq(helper.voiceConfiguration(),null);Object.assign(process.env,config);
 voiceAllowed=false;eq((await voice.POST(request('POST'),context)).status,429);voiceAllowed=true;
 for(const accessRole of ['owner','editor','commenter']){
  role=accessRole;const response=await voice.POST(request('POST',{identity:'forged',room:'forged',canPublishSources:['camera']}),context);
  eq(response.status,200);eq(response.headers.get('cache-control'),'private, no-store');const credentials=await response.json();eq(credentials.url,config.LIVEKIT_URL);
  const claims=await new sdk.TokenVerifier(config.LIVEKIT_API_KEY,config.LIVEKIT_API_SECRET).verify(credentials.token);
  eq(claims.sub,actor);eq(claims.name,'Jamie');eq(claims.video.room,helper.voiceRoomName(room,epoch));eq(claims.video.roomJoin,true);eq(claims.video.canSubscribe,true);eq(claims.video.canPublishData,false);eq(claims.exp-claims.nbf,120);
  assert.deepEqual(claims.video.canPublishSources,['microphone']);checks++;
  const options=events.at(-1).options;eq(options.maxParticipants,4);eq(options.emptyTimeout,60);eq(options.departureTimeout,20);
 }
 role='owner';createFailure=true;eq((await voice.POST(request('POST'),context)).status,503);createFailure=false;
 removeDuringJoin=true;eq((await voice.POST(request('POST'),context)).status,403);eq(events.at(-1).kind,'close');member=true;removeDuringJoin=false;
 for(const body of [{action:'member',user_id:actor,role:'remove'},{action:'delete'},{action:'leave'},{action:'share',enabled:false}]){
  events=[];eq((await one.PATCH(request('PATCH',body),context)).status,200);eq(events[0].kind,'close');eq(events[1].kind,'mutation');
 }
 events=[];closeFailure=Error('provider unavailable');eq((await one.PATCH(request('PATCH',{action:'share',enabled:false}),context)).status,503);eq(events.length,1);closeFailure=null;
 closeFailure={code:'not_found'};eq((await one.PATCH(request('PATCH',{action:'delete'}),context)).status,200);closeFailure=null;
 role='commenter';events=[];await one.PATCH(request('PATCH',{action:'delete'}),context);eq(events.some(e=>e.kind==='close'),false); // SQL, separately tested, denies the unauthorized mutation.
 const cursor={surface:'plan',x:.2,y:.6,session:'session',at:Date.now()};assert.deepEqual(protocol.readCursor(cursor),cursor);checks++;
 for(const value of [null,{...cursor,x:NaN},{...cursor,y:Infinity},{...cursor,x:-1},{...cursor,x:2},{...cursor,surface:'unknown'},{...cursor,session:'x'.repeat(65)}])eq(protocol.readCursor(value),null);
 eq(protocol.readPresence({section:'room',view:'2d',session:'x',active:true,at:1,selected:'x'.repeat(101)}).selected,null);
 eq(protocol.readPresence({section:'outside',view:'2d',session:'x',active:true,at:1}),null);
 eq(new Set(['a','b','c','d'].map(id=>protocol.collaboratorColor(id,['a','b','c','d']))).size,4);
 // 3D cursors: an optional height (0-20 ft) and piece id.
 assert.deepEqual(protocol.readCursor({...cursor,h:2.5,id:'desk-a'}),{...cursor,h:2.5,id:'desk-a'});checks++;
 for(const extra of [{h:-1},{h:21},{h:NaN},{id:''},{id:'x'.repeat(101)},{id:'<script>'},{id:7}])eq(protocol.readCursor({...cursor,...extra}),null);
 // Spot comment targets round-trip with bounded precision.
 eq(protocol.pointTarget({x:.123456,y:1.2,h:3.256}),'point:0.1235:1:3.26');eq(protocol.pointTarget({x:0,y:.5}),'point:0:0.5');eq(protocol.pointTarget({x:.5,y:.5,h:0}),'point:0.5:0.5');
 assert.deepEqual(protocol.readPointTarget('point:0.1235:1:3.26'),{x:.1235,y:1,h:3.26});checks++;
 for(const bad of ['point:1.5:0','point:0.5:0.5:21','point:0.5:0.5:-1','point:0.1:0.2:3:4','furniture:desk','point:0.5'])eq(protocol.readPointTarget(bad),null);
 // "Look here" pings: a room point plus session, time and sequence; anything else is dropped.
 const ping={x:.4,y:.6,h:3,id:'desk-a',session:'s',at:Date.now(),seq:2};assert.deepEqual(protocol.readPing(ping),ping);checks++;
 for(const bad of [null,{...ping,x:2},{...ping,seq:1.5},{...ping,seq:undefined},{...ping,session:'x'.repeat(65)},{...ping,at:'now'},{...ping,h:99},{...ping,id:'bad id'}])eq(protocol.readPing(bad),null);
 const spotRoom={lengthFt:12,widthFt:10,inside:(x,y)=>x>=0&&x<=12&&y>=0&&y<=10},desk={label:'Desk',x:1,y:1,w:4,h:2};
 eq(protocol.spotLabel({x:6/12,y:2/10},spotRoom,[desk],[]),'Spot near Desk');
 eq(protocol.spotLabel({x:11.5/12,y:5/10},spotRoom,[desk],[{x:12,y:5}]),'Spot by the window');
 eq(protocol.spotLabel({x:10/12,y:9/10},spotRoom,[desk],[]),'Spot on the floor');
 eq(protocol.spotLabel({x:10/12,y:0,h:5},spotRoom,[desk],[]),'Spot on the wall');
 eq(protocol.spotLabel({x:10/12,y:9/10},{...spotRoom,inside:()=>false},[desk],[]),'Spot (outside the room now)');
 console.log(`PASS: ${checks} voice boundary, token, revocation and cursor validation checks. No provider network requests were sent.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
