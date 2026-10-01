// Real SQL in disposable local PostgreSQL, never a Supabase/customer account.
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const friend = '00000000-0000-4000-8000-000000000002';
try {
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key,email text);
    create table profiles(id uuid primary key references auth.users(id),plan text);
    create table saved_rooms(id text primary key,user_id uuid references auth.users(id));
    create table purchase_feedback(id int primary key,user_id uuid references auth.users(id));`);
  await db.query('insert into auth.users values($1,$2),($3,$4)', [owner, 'owner@example.test', friend, 'friend@example.test']);
  await db.query("insert into profiles values($1,'pro'),($2,'free')", [owner, friend]);
  await db.query("insert into saved_rooms values('owned',$1),('friend',$2)", [owner, friend]);
  await db.query('insert into purchase_feedback values(1,$1),(2,$2)', [owner, friend]);
  await db.exec(await readFile(new URL('../docs/migrations/20260927_room_workspaces.sql', import.meta.url), 'utf8'));
  const migration = await readFile(new URL('../docs/migrations/20260928_account_controls.sql', import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
  assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n, 2, 'Applying the migration deletes no accounts');
  assert.equal((await db.query('select dormscape_account_deletion_ready() ready')).rows[0].ready, true);
  const act = async (actor,id,action,payload) => (await db.query('select dormscape_workspace_action($1,$2,$3,$4) r',[actor,id,action,JSON.stringify(payload)])).rows[0].r;
  const create = (actor,name) => act(actor,null,'create',{name,snapshot:{name,room_dimensions:{length_ft:15,width_ft:12},furniture_positions:[],selected_products:{}}});
  const room = (await create(owner,'Shared room')).id, other = (await create(friend,'Friend room')).id;
  await act(owner,room,'share',{enabled:true});
  await act(owner,room,'invite',{token_hash:'test',role:'editor'});
  await act(friend,null,'join',{token_hash:'test'});
  await act(owner,room,'comment',{body:'My comment',target:'room'});
  await db.query("insert into site_reports(user_id,category,description,email) values($1,'bug','This is a test report long enough.','owner@example.test')",[owner]);
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(() => db.query('select * from site_reports'), /permission denied/);
    await assert.rejects(() => db.query('select dormscape_account_deletion_ready()'), /permission denied/);
    await db.exec('reset role');
  }
  // Simulate an unexpected dependency: everything must roll back on failure.
  await db.exec('create table deletion_blocker(user_id uuid references auth.users(id))');
  await db.query('insert into deletion_blocker values($1)', [owner]);
  await assert.rejects(() => db.query('delete from auth.users where id=$1', [owner]), /foreign key/);
  assert.equal((await db.query('select count(*)::int n from room_workspaces where id=$1',[room])).rows[0].n,1,'No partial workspace deletion');
  assert.equal((await db.query('select count(*)::int n from profiles where id=$1',[owner])).rows[0].n,1,'Profile rolls back too');
  await db.query('delete from deletion_blocker where user_id=$1',[owner]);
  await db.query('delete from auth.users where id=$1',[owner]);
  for (const table of ['profiles','saved_rooms','purchase_feedback']) {
    assert.equal((await db.query(`select count(*)::int n from ${table}`)).rows[0].n,1,`Only deleted user's ${table} removed`);
  }
  assert.equal((await db.query('select id from room_workspaces')).rows[0].id,other,'Friend workspace survives');
  for (const table of ['workspace_comments','workspace_versions','workspace_invites']) {
    assert.equal((await db.query(`select count(*)::int n from ${table} where workspace_id=$1`,[room])).rows[0].n,0,`Owned ${table} removed`);
  }
  const report = (await db.query('select user_id,email,description from site_reports')).rows[0];
  assert.equal(report.user_id,null); assert.equal(report.email,null); assert(report.description);
  console.log('PASS: migration is rerunnable, private report permissions, transactional deletion rollback, scoped cleanup, shared-room cascade and report de-identification.');
} finally { await db.close(); }
