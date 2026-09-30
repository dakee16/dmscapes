-- Apply after 20260927_room_workspaces.sql. Safe to re-run.
-- Email-bound invitations reserve one of four places, including the owner.
-- Existing members are never evicted; over-capacity rooms cannot add members.
begin;
alter table public.workspace_invites add column if not exists email text;
alter table public.workspace_invites add column if not exists accepted_by uuid references auth.users(id) on delete cascade;
-- Older anonymous links are replaced by recipient-specific email invitations.
delete from public.workspace_invites where email is null;
create unique index if not exists workspace_invite_email on public.workspace_invites(workspace_id,email);
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
  invite_email text;
  actor_email text;
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
    select lower(email) into actor_email from auth.users where id=p_actor and email_confirmed_at is not null;
    if inv.email is null or actor_email is distinct from inv.email then
      return jsonb_build_object('error','Sign in with the verified email address that received this invitation.','status',403);
    end if;
    if member_role is not null then return jsonb_build_object('id',w.id); end if;
    if inv.accepted_by is not null then return jsonb_build_object('error','This invitation has already been used. Ask the owner for a new email invitation.','status',404); end if;
    if (select count(*) from workspace_members where workspace_id=w.id) >= 4 then return jsonb_build_object('error','This room has reached its four-person limit, including the owner.','status',409); end if;
    insert into workspace_members(workspace_id,user_id,role) values(w.id,p_actor,inv.role);
    update workspace_invites set accepted_by=p_actor where id=inv.id;
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
    invite_email := lower(trim(p_payload->>'email'));
    if invite_email is null or length(invite_email)>254 or invite_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
      or coalesce(p_payload->>'role','') not in ('editor','commenter')
      or coalesce(p_payload->>'token_hash','') !~ '^[a-f0-9]{64}$' then
      return jsonb_build_object('error','Enter a valid email and choose an access level.','status',400);
    end if;
    if exists(select 1 from workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=w.id and lower(u.email)=invite_email) then
      return jsonb_build_object('error','That email already belongs to a member of this room.','status',409);
    end if;
    if (select count(*) from workspace_members where workspace_id=w.id) +
       (select count(*) from workspace_invites where workspace_id=w.id and accepted_by is null and expires_at>now() and email<>invite_email) >= 4 then
      return jsonb_build_object('error','All four places are filled or reserved. Remove a member or cancel a pending invitation first.','status',409);
    end if;
    delete from workspace_invites where workspace_id=w.id and (email=invite_email or expires_at<=now());
    insert into workspace_invites(workspace_id,token_hash,role,email) values(w.id,p_payload->>'token_hash',p_payload->>'role',invite_email) returning * into inv;
    return jsonb_build_object('ok',true,'invite_id',inv.id,'expires_at',inv.expires_at);
  elsif p_action = 'revoke' then
    delete from workspace_invites where workspace_id=w.id
      and (p_payload->>'invite_id' is null or id=(p_payload->>'invite_id')::uuid);
    return jsonb_build_object('ok',true);
  elsif p_action = 'member' then
    if p_payload->>'user_id'=w.owner_id::text then return jsonb_build_object('error','The owner cannot be removed or demoted.','status',400); end if;
    if p_payload->>'role'='remove' then
      delete from workspace_members where workspace_id=w.id and user_id=(p_payload->>'user_id')::uuid;
      delete from workspace_invites where workspace_id=w.id and accepted_by=(p_payload->>'user_id')::uuid;
    else update workspace_members set role=p_payload->>'role' where workspace_id=w.id and user_id=(p_payload->>'user_id')::uuid; end if;
    return jsonb_build_object('ok',true);
  elsif p_action = 'leave' then
    if member_role='owner' then return jsonb_build_object('error','The owner cannot leave their room.','status',400); end if;
    delete from workspace_members where workspace_id=w.id and user_id=p_actor;
    delete from workspace_invites where workspace_id=w.id and accepted_by=p_actor;
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
