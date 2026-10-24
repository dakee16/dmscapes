// Hall Finder roommate mode: the room halls route against mocked transport (membership, Pro
// host, what roommates can see, what's saved), then the migration in isolated Postgres.
// Run: node scripts/check-workspace-halls.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'..'),cache=new Map();
const A='11111111-1111-4111-8111-111111111111',B='33333333-3333-4333-8333-333333333333',C='44444444-4444-4444-8444-444444444444',gone='55555555-5555-4555-8555-555555555555';
const room='22222222-2222-4222-8222-222222222222';
const PIN_A=[-77.86341,40.79824],PIN_B=[-77.8601,40.7968];
let user=A,state;
const reset=()=>{state={plan:'pro',missing:false,upserts:[],college:'penn-state',
  members:[{user_id:A,role:'owner'},{user_id:B,role:'editor'},{user_id:C,role:'commenter'}],
  profiles:[{id:A,username:'jamie',full_name:null},{id:B,username:null,full_name:'Sam Lee'},{id:C,username:null,full_name:null}],
  rows:[
    {user_id:A,places:[{placeId:'willard-building',days:21,label:'ECON 102'},{pin:PIN_A,days:10}]},
    {user_id:B,places:[{placeId:'forum-building',days:21,label:'SECRET 101'},{pin:PIN_B,days:31},{placeId:'torn-down-hall',days:1}]},
    {user_id:gone,places:[{placeId:'forum-building',days:31}]},
  ]};};
function answer(table,f,single){
  if(table==='workspace_members')return single?{data:state.members.find(m=>m.user_id===f.user_id)??null,error:null}:{data:state.members.map(m=>({user_id:m.user_id})),error:null};
  if(table==='room_workspaces')return {data:{id:room,owner_id:A,shared:true,snapshot:{college_id:state.college}},error:null};
  if(table==='profiles')return single?{data:{plan:state.plan},error:null}:{data:state.profiles.filter(p=>f.id.includes(p.id)),error:null};
  if(table==='workspace_hall_places')return state.missing?{data:null,error:{code:'42P01'}}:{data:state.rows,error:null};
  throw new Error(`unexpected table ${table}`);
}
const db={from(table){const f={};let single=false;const q={select(){return q;},eq(k,v){f[k]=v;return q;},in(k,v){f[k]=v;return q;},order(){return q;},maybeSingle(){single=true;return q;},single(){single=true;return q;},
  upsert(values,opts){state.upserts.push({table,values,opts});return Promise.resolve({error:state.missing?{code:'42P01'}:null});},
  then(resolve,reject){return Promise.resolve(answer(table,f,single)).then(resolve,reject);}};return q;}};
function load(file){if(!path.extname(file))file+='.ts';if(file.endsWith('.json'))return require(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,resolveJsonModule:true}}).outputText;new Function('require','module','exports',code)(id=>{
 if(id==='server-only')return {};
 if(id.endsWith('supabase-server'))return {getServiceClient:()=>db};
 if(id.endsWith('supabase-auth'))return {getUserId:async()=>user};
 if(id.endsWith('rate-limit'))return {rateLimit:()=>({allowed:true})};
 return id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);
},m,m.exports);return m.exports;}
process.env.NEXT_PUBLIC_HALL_FINDER='on';
const route=load(path.join(root,'app/api/workspaces/[id]/halls/route.ts'));
const ctx={params:Promise.resolve({id:room})};
const req=(method='GET',query='',body)=>new Request(`https://example.test/api/workspaces/${room}/halls${query}`,{method,headers:{Authorization:'Bearer verified-by-auth'},...(body===undefined?{}:{body:JSON.stringify(body)})});

(async()=>{
  let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
  // Who can open it.
  reset();user=null;eq((await route.GET(req(),ctx)).status,401,'signed out');
  user='99999999-9999-4999-8999-999999999999';eq((await route.GET(req(),ctx)).status,404,'not a member');
  user=A;eq((await route.GET(req(),{params:Promise.resolve({id:'nope'})})).status,404,'bad room id');
  state.college='not-a-pilot';eq((await route.GET(req(),ctx)).status,404,'not a Hall Finder school');
  reset();state.plan='free';const free=await route.GET(req(),ctx);eq(free.status,403,'needs a Pro host');eq((await free.json()).upgrade,true,'says upgrade');
  reset();state.missing=true;const missing=await route.GET(req(),ctx);eq(missing.status,503,'table not created yet');eq((await missing.json()).unavailable,true,'says unavailable');
  eq((await route.PUT(req('PUT','',{places:[]}),ctx)).status,503,'PUT before the migration');

  // What a roommate sees.
  reset();user=B;
  const res=await route.GET(req('GET','?campus=1'),ctx);eq(res.status,200,'member reads');
  eq(res.headers.get('Cache-Control'),'private, no-store','not cached');
  const body=await res.json(),raw=JSON.stringify(body);
  eq(body.me,B,'me');
  eq(body.people.map(p=>p.userId),[A,B,C],'members in join order; a stale row for someone who left is ignored');
  eq(body.people.map(p=>p.name),['jamie','Sam','Roommate'],'names');
  const a=body.people[0],b=body.people[1];
  eq(a.places,[{placeId:'willard-building',days:21},{days:10}],"a roommate's building and days only");
  ok(!raw.includes('ECON 102'),"a roommate's course name is never sent");
  ok(!raw.includes(String(PIN_A[0])),"a roommate's pin spot is never sent");
  eq(b.places,[{placeId:'forum-building',days:21,label:'SECRET 101'},{pin:PIN_B,days:31}],'your own places in full; a building no longer on the map is dropped');
  eq(body.people[2].places,[],'no places yet');
  ok(body.start&&body.start.campus.collegeId==='penn-state'&&typeof body.start.imagesOn==='boolean','campus on the first load');
  ok(body.halls.length>10,'halls ranked');
  ok(body.halls.every(h=>Object.keys(h.weekly).sort().join()===[A,B].sort().join()),'only people with places are counted');
  ok(body.halls.every(h=>Math.abs(h.total-(h.weekly[A]+h.weekly[B]))<0.2&&h.longest===Math.max(h.weekly[A],h.weekly[B])),'total and longest');
  eq(body.routes,null,'no routes without a hall');
  const later=await (await route.GET(req(),ctx)).json();eq(later.start,undefined,'campus only on the first load');

  const hall=body.halls[0].dormId;
  const withRoutes=await (await route.GET(req('GET',`?hall=${hall}`),ctx)).json();
  eq(withRoutes.routes[A].length,2,'one route per place');
  eq(withRoutes.routes[A][1].line,null,"a roommate's pin route is held back");
  ok(typeof withRoutes.routes[A][0].line==='string'&&withRoutes.routes[A][0].minutes>0,"a roommate's building route is shown");
  ok(typeof withRoutes.routes[B][1].line==='string','your own pin route is shown');
  eq(withRoutes.routes[C],[],'no places, no routes');
  const filtered=await (await route.GET(req('GET','?filters=ac'),ctx)).json();
  ok(filtered.halls.length<body.halls.length,'filters narrow the halls');

  // Saving your own places.
  reset();user=C;
  for(const bad of [{},{places:'x'},{places:[{placeId:'willard-building',days:0}]},{places:[{placeId:'nowhere',days:1}]},{places:[{pin:[0,0],days:1}]},{places:Array.from({length:21},()=>({placeId:'willard-building',days:1}))}])
    eq((await route.PUT(req('PUT','',bad),ctx)).status,400,`rejects ${JSON.stringify(bad).slice(0,60)}`);
  eq(state.upserts.length,0,'nothing saved from bad input');
  const put=await route.PUT(req('PUT','',{user_id:A,workspace_id:'forged',places:[{placeId:'willard-building',days:5,label:'A very long course name that goes on',source:'ics'},{pin:PIN_A,days:3}]}),ctx);
  eq(put.status,200,'a commenter saves their own places');
  eq(state.upserts.at(-1).values,{workspace_id:room,user_id:C,places:[{placeId:'willard-building',days:5,label:'A very long course name '},{pin:PIN_A,days:3}]},'saved to your own row only, label trimmed');
  eq(state.upserts.at(-1).opts,{onConflict:'workspace_id,user_id'},'one row per member');
  eq((await route.PUT(req('PUT','',{places:[]}),ctx)).status,200,'clearing is allowed');
  eq(state.upserts.at(-1).values.places,[],'cleared');

  // The migration, twice, in isolated Postgres.
  const {PGlite}=await import('@electric-sql/pglite');
  const pg=new PGlite();
  await pg.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create table profiles(id uuid primary key,plan text);
    create table saved_rooms(id text primary key,user_id uuid);`);
  await pg.exec(fs.readFileSync(path.join(root,'docs/migrations/20260927_room_workspaces.sql'),'utf8'));
  const migration=fs.readFileSync(path.join(root,'docs/migrations/20261024_workspace_hall_places.sql'),'utf8');
  await pg.exec(migration);await pg.exec(migration);checks++;
  for(const [i,u] of [A,B,C].entries())await pg.query('insert into auth.users values($1,$2,now())',[u,`roommate${i}@example.test`]);
  await pg.query("insert into room_workspaces(id,owner_id,name,snapshot) values($1,$2,'Our room','{}')",[room,A]);
  await pg.query("insert into workspace_members(workspace_id,user_id,role) values($1,$2,'owner'),($1,$3,'editor'),($1,$4,'commenter')",[room,A,B,C]);
  const put1=(u,places)=>pg.query('insert into workspace_hall_places(workspace_id,user_id,places) values($1,$2,$3) on conflict (workspace_id,user_id) do update set places=excluded.places',[room,u,JSON.stringify(places)]);
  await put1(B,[{placeId:'willard-building',days:1}]);await put1(C,[]);
  await assert.rejects(put1(A,Array.from({length:21},()=>({days:1}))),'more than 20 places');checks++;
  await assert.rejects(put1(A,{placeId:'x'}),'not an array');checks++;
  await assert.rejects(pg.query("insert into workspace_hall_places(workspace_id,user_id) values($1,'66666666-6666-4666-8666-666666666666')",[room]),'only real users');checks++;
  await pg.query("update workspace_hall_places set updated_at=now()-interval '1 day' where user_id=$1",[B]);
  await put1(B,[{placeId:'forum-building',days:2}]);
  eq((await pg.query("select updated_at>now()-interval '1 minute' fresh from workspace_hall_places where user_id=$1",[B])).rows[0].fresh,true,'updated_at moves on save');
  await pg.query('delete from workspace_members where workspace_id=$1 and user_id=$2',[room,B]);
  eq((await pg.query('select user_id from workspace_hall_places order by user_id')).rows.map(r=>r.user_id),[C],"leaving a room takes your places with you");
  await pg.query('delete from room_workspaces where id=$1',[room]);
  eq((await pg.query('select count(*)::int n from workspace_hall_places')).rows[0].n,0,'deleting the room deletes its places');
  const priv=(await pg.query(`select has_table_privilege('anon','public.workspace_hall_places','select') anon_read, has_table_privilege('authenticated','public.workspace_hall_places','insert') user_write,
    has_function_privilege('authenticated','public.workspace_hall_places_member_gone()','execute') fn,
    (select relrowsecurity from pg_class where oid='public.workspace_hall_places'::regclass) rls`)).rows[0];
  eq(priv,{anon_read:false,user_write:false,fn:false,rls:true},'no browser access; RLS on');
  console.log(`PASS: ${checks} room halls checks (route visibility, Pro host, saving; migration twice, cascades, grants).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
