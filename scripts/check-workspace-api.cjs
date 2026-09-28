// Route boundaries use mocked transport; SQL permissions are checked separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'..'),cache=new Map();
const actor='11111111-1111-4111-8111-111111111111',room='22222222-2222-4222-8222-222222222222';
let user=actor,available=true,member=true,rpc=[],queries=[];
const db={from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},in(k,v){filters.push([k,v]);return q;},order(){return q;},limit(){return q;},single(){return q;},maybeSingle(){return q;},then(resolve,reject){queries.push({table,filters});const data=table==='workspace_members'?(member?{role:'owner'}:null):table==='room_workspaces'?{id:room,owner_id:actor,shared:true}:table==='profiles'?{plan:'pro'}:null;return Promise.resolve({data,error:null}).then(resolve,reject);}};return q;},async rpc(name,payload){rpc.push({name,payload});return {data:{ok:true,id:room,revision:2},error:null};}};
function load(file){if(!path.extname(file))file+='.ts';if(file.endsWith('.json'))return require(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(id=>{
 if(id.endsWith('supabase-server'))return {getServiceClient:()=>available?db:null};
 if(id.endsWith('supabase-auth'))return {getUserId:async()=>user};
 if(id.endsWith('rate-limit'))return {rateLimit:()=>({allowed:true})};
 return id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);
},m,m.exports);return m.exports;}
const list=load(path.join(root,'app/api/workspaces/route.ts')),one=load(path.join(root,'app/api/workspaces/[id]/route.ts')),join=load(path.join(root,'app/api/workspaces/join/route.ts'));
const boundary=load(path.join(root,'lib/workspace-server.ts'));
const request=(method='GET',body)=>new Request('https://example.test/api/workspaces',{method,headers:{Authorization:'Bearer verified-by-auth'},...(body===undefined?{}:{body:JSON.stringify(body)})});
const ctx={params:Promise.resolve({id:room})};
const snapshot={name:'My room',college_id:null,dorm_id:null,room_dimensions:{length_ft:15,width_ft:12,room_type:'double',occupants:2,bed_size:'twin_xl'},style:'minimalist',budget:500,template_id:'manual-empty',furniture_positions:[],selected_products:{}};
(async()=>{
 user=null;assert.equal((await list.GET(request())).status,401);assert.equal((await list.POST(request('POST',{snapshot}))).status,401);assert.equal((await one.PATCH(request('PATCH',{action:'delete'}),ctx)).status,401);assert.equal((await join.POST(request('POST',{token:'x'.repeat(43)}))).status,401);assert.equal(rpc.length,0);
 user=actor;available=false;assert.equal((await list.GET(request())).status,503);available=true;
 assert.equal((await one.GET(request(),{params:Promise.resolve({id:'invalid'})})).status,404);
 member=false;assert.equal((await one.GET(request(),ctx)).status,404);assert(queries.some(q=>q.table==='workspace_members'&&q.filters.some(([k,v])=>k==='user_id'&&v===actor)));member=true;
 const created=await list.POST(request('POST',{snapshot,owner_id:'forged',user_id:'forged'}));assert.equal(created.status,200);assert.equal(created.headers.get('Cache-Control'),'private, no-store');assert.equal(created.headers.get('Referrer-Policy'),'no-referrer');assert.equal(rpc.at(-1).payload.p_actor,actor);assert.equal(rpc.at(-1).payload.p_payload.snapshot.owner_id,undefined);
 assert.equal((await list.POST(request('POST',{source_room_id:'other-save'}))).status,404);assert(queries.some(q=>q.table==='saved_rooms'&&q.filters.some(([k,v])=>k==='user_id'&&v===actor)));
 for(const bad of [{...snapshot,budget:0},{...snapshot,room_dimensions:{...snapshot.room_dimensions,length_ft:-1}},{...snapshot,style:'invented'}])assert.equal((await list.POST(request('POST',{snapshot:bad}))).status,400);
 assert.equal((await one.PATCH(request('PATCH',{action:'save',snapshot,revision:1,p_actor:'forged'}),ctx)).status,200);assert.equal(rpc.at(-1).payload.p_actor,actor);assert.equal(rpc.at(-1).payload.p_payload.p_actor,undefined);
 for(const body of [{action:'save',snapshot,revision:0},{action:'member',user_id:actor,role:'owner'},{action:'share',enabled:'yes'},{action:'comment',body:' ',target:'room'},{action:'restore',version_id:'bad',revision:1},{action:'unknown'}])assert.equal((await one.PATCH(request('PATCH',body),ctx)).status,400);
 const invite=await one.PATCH(request('PATCH',{action:'invite',role:'editor'}),ctx),token=(await invite.json()).token;assert.match(token,/^[A-Za-z0-9_-]{43}$/);assert.match(rpc.at(-1).payload.p_payload.token_hash,/^[a-f0-9]{64}$/);assert(!JSON.stringify(rpc.at(-1)).includes(token));
 assert.equal((await join.POST(request('POST',{token,user_id:'forged'}))).status,200);assert.equal(rpc.at(-1).payload.p_actor,actor);assert.equal(rpc.at(-1).payload.p_payload.token_hash,require('node:crypto').createHash('sha256').update(token).digest('hex'));
 assert.equal((await join.POST(request('POST',{token:'bad'}))).status,400);
 assert.equal(await boundary.workspaceBody(new Request('https://example.test',{method:'POST',body:'x'.repeat(750001)})),null);
 assert.equal(await boundary.workspaceBody(new Request('https://example.test',{method:'POST',body:'[]'})),null);
 console.log('PASS: workspace APIs require verified identity, scope reads/imports to members, validate writes, bound bodies, hash invites and disable caching.');
})().catch(e=>{console.error(e);process.exitCode=1;});
