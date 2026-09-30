// Execute real migrations, grants and RLS against isolated PostgreSQL.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();let checks=0;
const equal=(a,b,n)=>{assert.deepEqual(a,b,n);checks++;};
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=uid(1),editor=uid(2),commenter=uid(3),outsider=uid(4);
const action=async(actor,id,action,payload={})=>(await db.query('select dormscape_workspace_action($1,$2,$3,$4) result',[actor,id,action,JSON.stringify(payload)])).rows[0].result;
const comment=async(actor,id,action,payload={})=>(await db.query('select dormscape_workspace_comment($1,$2,$3,$4) result',[actor,id,action,JSON.stringify(payload)])).rows[0].result;
const epoch=async(id)=>(await db.query('select realtime_epoch from room_workspaces where id=$1',[id])).rows[0].realtime_epoch;
const topic=(id,epoch,who='updates')=>`workspace:${id}:${epoch}:${who}`;
async function allowed(actor,channel,write=false){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);return (await db.query('select workspace_realtime_access($1,$2) ok',[channel,write])).rows[0].ok;}
try{
  await db.exec(`create schema auth;create schema realtime;create role anon;create role authenticated;create role service_role;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table profiles(id uuid primary key,plan text);create table saved_rooms(id text primary key,user_id uuid);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table realtime.messages(id serial primary key,extension text);
    create table public.test_broadcasts(payload jsonb,event text,topic text,private boolean);
    create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
    create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$insert into public.test_broadcasts values(payload,event,topic,private)$$;
    alter table realtime.messages enable row level security;
    grant usage on schema realtime,auth,public to authenticated;
    grant select,insert on realtime.messages to authenticated;grant usage on sequence realtime.messages_id_seq to authenticated;`);
  for(let n=1;n<=4;n++){await db.query('insert into auth.users values($1,$2,now())',[uid(n),`roommate${n}@example.test`]);await db.query('insert into profiles values($1,$2)',[uid(n),n===1?'pro':'free']);}
  for(const file of ['20260927_room_workspaces.sql','20260928_email_invitations.sql','20260930_workspace_collaboration.sql']){
    const sql=await readFile(new URL(`../docs/migrations/${file}`,import.meta.url),'utf8');await db.exec(sql);if(file.includes('collaboration'))await db.exec(sql);
  }
  const snapshot={name:'Our room',room_dimensions:{length_ft:15,width_ft:12},furniture_positions:[],selected_products:{}};
  const room=(await action(owner,null,'create',{name:'Our room',snapshot})).id;
  const personal=(await action(owner,null,'create',{name:'Private',snapshot})).id;
  const personalEpoch=await epoch(room);
  equal(await allowed(owner,topic(room,personalEpoch,owner)),false,'Private room has no live channel');
  await action(owner,room,'share',{enabled:true});
  await db.query("insert into workspace_members(workspace_id,user_id,role) values($1,$2,'editor'),($1,$3,'commenter')",[room,editor,commenter]);
  const current=await epoch(room);
  equal(current===personalEpoch,false,'Membership and sharing rotate channel key');
  equal(await allowed(owner,topic(room,current)),true,'Owner reads server changes');
  equal(await allowed(editor,topic(room,current,owner)),true,'Editor sees owner presence');
  equal(await allowed(commenter,topic(room,current,editor)),true,'Commenter sees editor presence');
  equal(await allowed(outsider,topic(room,current,owner)),false,'Outsider cannot subscribe');
  equal(await allowed(owner,topic(room,current,owner),true),true,'Owner publishes own cursor');
  equal(await allowed(editor,topic(room,current,editor),true),true,'Editor publishes own cursor');
  equal(await allowed(commenter,topic(room,current,commenter),true),true,'Commenter publishes own cursor');
  equal(await allowed(editor,topic(room,current,owner),true),false,'Cannot impersonate owner');
  equal(await allowed(owner,topic(room,current),true),false,'Clients cannot forge server changes');
  equal(await allowed(owner,topic(room,current,outsider)),false,'Nonmember topic denied');
  equal(await allowed(owner,'workspace:invalid:invalid:updates'),false,'Malformed topic denied');
  equal(await allowed(owner,'unrelated'),false,'Other namespaces denied');
  equal(await allowed(owner,topic(room,personalEpoch,owner)),false,'Old channel key denied');
  // Real authenticated SQL checks, including a permissive policy from another app.
  await db.exec(`create policy other_app_read on realtime.messages for select to authenticated using(true);
    create policy other_app_write on realtime.messages for insert to authenticated with check(true);
    insert into realtime.messages(extension) values('broadcast'),('presence');`);
  await db.query("select set_config('realtime.topic',$1,false),set_config('request.jwt.claim.sub',$2,false)",[topic(room,current,owner),editor]);
  await db.exec('set role authenticated');
  equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n,2,'Authorized member receives messages through RLS');
  let forbidden=false;try{await db.exec("insert into realtime.messages(extension) values('broadcast')");}catch{forbidden=true;}
  equal(forbidden,true,'RLS denies forged publisher despite permissive policy');
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[outsider]);await db.exec('set role authenticated');
  equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n,0,'RLS denies outsider despite permissive policy');
  let exposed=false;try{await db.query('select dormscape_workspace_comment($1,$2,$3,$4)',[owner,room,'comment','{}']);exposed=true;}catch{}
  equal(exposed,false,'RPC callable only by service role');
  await db.exec('reset role');
  const root=await comment(commenter,room,'comment',{body:'Put this by the window?',target:'furniture:desk'});
  equal(root.ok,true,'Commenter starts anchored conversation');
  const reply=await comment(editor,room,'comment',{body:'Yes!',target:'room',parent_id:root.id});
  equal(reply.ok,true,'Editor replies without changing layout');
  equal((await db.query('select target from workspace_comments where id=$1',[reply.id])).rows[0].target,'furniture:desk','Reply inherits root target');
  equal((await db.query('select revision from room_workspaces where id=$1',[room])).rows[0].revision,1,'Comments do not increment room revision');
  equal((await comment(owner,personal,'comment',{body:'Cross-room reply',target:'room',parent_id:root.id})).status,404,'Cannot reply across rooms');
  equal((await comment(editor,room,'comment',{body:'Nested',target:'room',parent_id:reply.id})).status,404,'Replies do not create nested roots');
  equal((await comment(outsider,room,'comment',{body:'Attack',target:'room'})).status,404,'Outsider cannot comment');
  equal((await comment(editor,room,'resolve',{comment_id:root.id,resolved:true})).ok,true,'Editor resolves thread');
  equal((await comment(commenter,room,'comment',{body:'Reply',target:'room',parent_id:root.id})).status,409,'Resolved thread requires reopening');
  equal((await comment(commenter,room,'resolve',{comment_id:root.id,resolved:false})).ok,true,'Author reopens thread');
  const other=await comment(owner,room,'comment',{body:'A different thought',target:'room'});
  equal((await comment(commenter,room,'resolve',{comment_id:other.id,resolved:true})).status,403,'Commenter cannot resolve another author');
  equal((await comment(owner,room,'comment',{body:' ',target:'room'})).status,400,'Empty comment denied');
  equal((await comment(owner,room,'comment',{body:'x'.repeat(1501),target:'room'})).status,400,'Oversized comment denied');
  await action(owner,room,'member',{user_id:editor,role:'remove'});
  const rotated=await epoch(room);
  equal(rotated===current,false,'Removal rotates topics');
  equal(await allowed(editor,topic(room,rotated,owner)),false,'Removed editor cannot subscribe to new topics');
  equal(await allowed(owner,topic(room,current,owner)),false,'Remaining members cannot publish to old topics');
  equal((await comment(editor,room,'comment',{body:'After removal',target:'room'})).status,404,'Removed editor cannot reply');
  equal((await db.query('select count(*)::int n from test_broadcasts where topic=$1 and payload->>\'kind\'=\'access\'',[topic(room,current)])).rows[0].n>0,true,'Old channel gets access-change hint');
  await db.query("update profiles set plan='free' where id=$1",[owner]);
  equal(await allowed(commenter,topic(room,await epoch(room),commenter)),false,'Downgrade closes live access');
  equal((await comment(commenter,room,'comment',{body:'After downgrade',target:'room'})).status,403,'Downgrade blocks member comments');
  equal((await comment(owner,room,'comment',{body:'My personal note',target:'room'})).ok,true,'Owner retains notes');
  equal((await db.query("select count(*)::int n from test_broadcasts where private=false or payload::text like '%body%' or payload::text like '%snapshot%'")).rows[0].n,0,'Change signals are private and contain no room or comment contents');
  console.log(`PASS: ${checks} collaboration database, RLS, identity, revocation and comment checks.`);
}finally{await db.close();}
