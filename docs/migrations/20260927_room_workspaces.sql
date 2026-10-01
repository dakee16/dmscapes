-- Apply to the feature preview database before enabling workspaces there.
-- All access goes through authenticated Next.js routes. No browser table access.
begin;
create table if not exists public.room_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  revision integer not null default 1,
  shared boolean not null default false,
  source_room_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists workspace_one_shared on public.room_workspaces(owner_id) where shared;
create unique index if not exists workspace_saved_source on public.room_workspaces(owner_id, source_room_id) where source_room_id is not null;
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.room_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','commenter')),
  joined_at timestamptz not null default now(),
  primary key(workspace_id, user_id)
);
create index if not exists workspace_member_user on public.workspace_members(user_id);
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.room_workspaces(id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('editor','commenter')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create table if not exists public.workspace_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.room_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  target text not null default 'room' check (char_length(target) <= 120),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists workspace_comments_room on public.workspace_comments(workspace_id, created_at);
create table if not exists public.workspace_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.room_workspaces(id) on delete cascade,
  revision integer not null,
  name text not null check (char_length(name) between 1 and 80),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists workspace_versions_room on public.workspace_versions(workspace_id, created_at);
alter table public.room_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_comments enable row level security;
alter table public.workspace_versions enable row level security;
revoke all on public.room_workspaces, public.workspace_members, public.workspace_invites, public.workspace_comments, public.workspace_versions from anon, authenticated;
grant all on public.room_workspaces, public.workspace_members, public.workspace_invites, public.workspace_comments, public.workspace_versions to service_role;

-- Service role only: p_actor comes from verified auth.getUser(), never the body.
-- Row locks serialize membership, role changes and revision-checked writes.
create or replace function public.dormscape_workspace_action(p_actor uuid, p_id uuid, p_action text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  w public.room_workspaces%rowtype;
  inv public.workspace_invites%rowtype;
  v public.workspace_versions%rowtype;
  member_role text;
  owner_pro boolean;
  next_snapshot jsonb;
  new_id uuid;
begin
  if p_actor is null then return jsonb_build_object('error','Sign in to continue.','status',401); end if;
  if p_action = 'create' then
    perform pg_advisory_xact_lock(hashtextextended(p_actor::text, 19));
    if p_payload->>'source_room_id' is not null then
      select * into w from room_workspaces where owner_id=p_actor and source_room_id=p_payload->>'source_room_id';
      if found then return jsonb_build_object('id',w.id); end if;
      if not exists(select 1 from saved_rooms where id=p_payload->>'source_room_id' and user_id=p_actor) then
        return jsonb_build_object('error','That saved room is not in your account.','status',404);
      end if;
    end if;
    insert into room_workspaces(owner_id,name,snapshot,source_room_id)
      values(p_actor,p_payload->>'name',p_payload->'snapshot',p_payload->>'source_room_id') returning * into w;
    insert into workspace_members(workspace_id,user_id,role) values(w.id,p_actor,'owner');
    insert into workspace_versions(workspace_id,revision,name,snapshot) values(w.id,w.revision,'Starting point',w.snapshot);
    return jsonb_build_object('id',w.id);
  end if;
  if p_action = 'join' then
    -- Locate first, lock the room, then re-read the invite to honor revocation.
    select * into inv from workspace_invites where token_hash=p_payload->>'token_hash';
    if not found then return jsonb_build_object('error','This invitation is invalid or expired. Ask the owner for a new link.','status',404); end if;
    p_id := inv.workspace_id;
  end if;
  select * into w from room_workspaces where id=p_id for update;
  if not found then return jsonb_build_object('error','Room not found.','status',404); end if;
  select coalesce(plan='pro',false) into owner_pro from profiles where id=w.owner_id;
  owner_pro := coalesce(owner_pro,false);
  select role into member_role from workspace_members where workspace_id=w.id and user_id=p_actor;
  if p_action = 'join' then
    select * into inv from workspace_invites where workspace_id=w.id and token_hash=p_payload->>'token_hash' and expires_at > now();
    if not found or not w.shared or not owner_pro then return jsonb_build_object('error','This invitation is unavailable. Ask the owner for a new link.','status',404); end if;
    if member_role is not null then return jsonb_build_object('id',w.id); end if;
    if (select count(*) from workspace_members where workspace_id=w.id) >= 8 then return jsonb_build_object('error','This room has reached its eight-person limit.','status',409); end if;
    insert into workspace_members(workspace_id,user_id,role) values(w.id,p_actor,inv.role);
    return jsonb_build_object('id',w.id);
  end if;
  if member_role is null then return jsonb_build_object('error','Room not found or access removed.','status',404); end if;
  if p_action in ('share','invite','revoke','member','delete') and member_role <> 'owner' then
    return jsonb_build_object('error','Only the room owner can do that.','status',403);
  end if;
  if p_action = 'share' then
    if (p_payload->>'enabled')::boolean then
      if not owner_pro then return jsonb_build_object('error','Pro is required to host a shared room.','status',403); end if;
      perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text, 19));
      if exists(select 1 from room_workspaces where owner_id=w.owner_id and shared and id<>w.id) then return jsonb_build_object('error','Pro includes one active shared room. Make your other shared room personal first.','status',409); end if;
      update room_workspaces set shared=true where id=w.id;
    else
      update room_workspaces set shared=false where id=w.id;
      delete from workspace_invites where workspace_id=w.id;
      delete from workspace_members where workspace_id=w.id and role<>'owner';
    end if;
    return jsonb_build_object('ok',true);
  elsif p_action = 'invite' then
    if not owner_pro or not w.shared then return jsonb_build_object('error','Enable Pro sharing for this room first.','status',403); end if;
    delete from workspace_invites where workspace_id=w.id;
    insert into workspace_invites(workspace_id,token_hash,role) values(w.id,p_payload->>'token_hash',p_payload->>'role');
    return jsonb_build_object('ok',true);
  elsif p_action = 'revoke' then
    delete from workspace_invites where workspace_id=w.id;
    return jsonb_build_object('ok',true);
  elsif p_action = 'member' then
    if p_payload->>'user_id'=w.owner_id::text then return jsonb_build_object('error','The owner cannot be removed or demoted.','status',400); end if;
    if p_payload->>'role'='remove' then delete from workspace_members where workspace_id=w.id and user_id=(p_payload->>'user_id')::uuid;
    else update workspace_members set role=p_payload->>'role' where workspace_id=w.id and user_id=(p_payload->>'user_id')::uuid; end if;
    return jsonb_build_object('ok',true);
  elsif p_action = 'leave' then
    if member_role='owner' then return jsonb_build_object('error','The owner cannot leave their room.','status',400); end if;
    delete from workspace_members where workspace_id=w.id and user_id=p_actor;
    return jsonb_build_object('ok',true);
  elsif p_action = 'delete' then
    delete from room_workspaces where id=w.id;
    return jsonb_build_object('ok',true);
  end if;
  if member_role<>'owner' and (not owner_pro or not w.shared) then return jsonb_build_object('error','The owner needs Pro to continue shared editing.','status',403); end if;
  if p_action='comment' then
    if (select count(*) from workspace_comments where workspace_id=w.id) >= 1000 then return jsonb_build_object('error','This room has reached its comment limit.','status',409); end if;
    insert into workspace_comments(workspace_id,user_id,body,target) values(w.id,p_actor,p_payload->>'body',p_payload->>'target');
    return jsonb_build_object('ok',true);
  elsif p_action='resolve' then
    update workspace_comments set resolved=(p_payload->>'resolved')::boolean where workspace_id=w.id and id=(p_payload->>'comment_id')::uuid;
    return jsonb_build_object('ok',true);
  end if;
  if member_role='commenter' then return jsonb_build_object('error','You have comment access. Ask the owner for editing access.','status',403); end if;
  if p_action in ('save','restore','checkpoint') then
    if (p_payload->>'revision')::integer is distinct from w.revision then return jsonb_build_object('error','A roommate saved a newer version. Review their changes before saving yours.','status',409); end if;
    if p_action='checkpoint' then
      insert into workspace_versions(workspace_id,revision,name,snapshot) values(w.id,w.revision,p_payload->>'name',w.snapshot);
    else
      if p_action='restore' then
        select * into v from workspace_versions where workspace_id=w.id and id=(p_payload->>'version_id')::uuid;
        if not found then return jsonb_build_object('error','That version is no longer available.','status',404); end if;
        next_snapshot := v.snapshot;
        insert into workspace_versions(workspace_id,revision,name,snapshot) values(w.id,w.revision,'Before restoring a version',w.snapshot);
      else
        next_snapshot := p_payload->'snapshot';
        if not exists(select 1 from workspace_versions where workspace_id=w.id and created_at > now()-interval '5 minutes') then
          insert into workspace_versions(workspace_id,revision,name,snapshot) values(w.id,w.revision,'Autosave',w.snapshot);
        end if;
      end if;
      update room_workspaces set snapshot=next_snapshot,name=next_snapshot->>'name',revision=revision+1,updated_at=now() where id=w.id returning * into w;
    end if;
    delete from workspace_versions where workspace_id=w.id and id not in (select id from workspace_versions where workspace_id=w.id order by created_at desc,id desc limit 20);
    return jsonb_build_object('revision',w.revision,'updated_at',w.updated_at);
  end if;
  return jsonb_build_object('error','Unknown workspace action.','status',400);
end;
$$;
revoke all on function public.dormscape_workspace_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dormscape_workspace_action(uuid,uuid,text,jsonb) to service_role;
commit;
