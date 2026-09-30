-- Run after 20260928_email_invitations.sql. Safe to re-run.
-- Private realtime channels are separate from durable room/comment writes.
begin;
alter table public.room_workspaces add column if not exists realtime_epoch uuid not null default gen_random_uuid();
alter table public.workspace_comments add column if not exists parent_id uuid references public.workspace_comments(id) on delete cascade;
create index if not exists workspace_comments_parent on public.workspace_comments(parent_id);

-- Each member publishes only on their own topic. A browser cannot impersonate
-- another roommate by putting their ID/name in a cursor or presence payload.
create or replace function public.workspace_realtime_access(topic text, writing boolean default false)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare parts text[] := string_to_array(topic, ':'); w public.room_workspaces; actor uuid := auth.uid();
begin
  if actor is null or array_length(parts,1) <> 4 or parts[1] <> 'workspace' then return false; end if;
  begin
    select * into w from room_workspaces where id=parts[2]::uuid and realtime_epoch=parts[3]::uuid;
  exception when invalid_text_representation then return false; end;
  if w.id is null or not w.shared or not exists(select 1 from profiles where id=w.owner_id and plan='pro')
    or not exists(select 1 from workspace_members where workspace_id=w.id and user_id=actor) then return false; end if;
  if writing then return parts[4]=actor::text; end if;
  return parts[4]='updates' or exists(select 1 from workspace_members where workspace_id=w.id and user_id::text=parts[4]);
end $$;
revoke all on function public.workspace_realtime_access(text,boolean) from public,anon;
grant execute on function public.workspace_realtime_access(text,boolean) to authenticated;

drop policy if exists dormscape_workspace_receive on realtime.messages;
create policy dormscape_workspace_receive on realtime.messages for select to authenticated
  using (extension in ('broadcast','presence') and public.workspace_realtime_access((select realtime.topic()),false));
drop policy if exists dormscape_workspace_send on realtime.messages;
create policy dormscape_workspace_send on realtime.messages for insert to authenticated
  with check (extension in ('broadcast','presence') and public.workspace_realtime_access((select realtime.topic()),true));
-- Restrictive companions prevent an unrelated permissive policy from opening
-- this application's namespace. Do not alter policies for other applications.
drop policy if exists dormscape_workspace_receive_guard on realtime.messages;
create policy dormscape_workspace_receive_guard on realtime.messages as restrictive for select to authenticated
  using ((select realtime.topic()) not like 'workspace:%' or public.workspace_realtime_access((select realtime.topic()),false));
drop policy if exists dormscape_workspace_send_guard on realtime.messages;
create policy dormscape_workspace_send_guard on realtime.messages as restrictive for insert to authenticated
  with check ((select realtime.topic()) not like 'workspace:%' or public.workspace_realtime_access((select realtime.topic()),true));

create or replace function public.workspace_notify_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare w public.room_workspaces; old_topic text;
begin
  if tg_table_name='room_workspaces' then
    if tg_op='DELETE' then w:=old; else w:=new; end if;
    if tg_op='UPDATE' and old.realtime_epoch<>new.realtime_epoch then
      old_topic:='workspace:'||old.id||':'||old.realtime_epoch||':updates';
      perform realtime.send(jsonb_build_object('kind','access'),'changed',old_topic,true);
    end if;
  else
    select * into w from room_workspaces where id=case when tg_op='DELETE' then old.workspace_id else new.workspace_id end;
  end if;
  if w.id is not null then
    perform realtime.send(jsonb_build_object('kind',case when tg_table_name='workspace_comments' then 'comments' else 'room' end),
      'changed','workspace:'||w.id||':'||w.realtime_epoch||':updates',true);
  end if;
  return null;
end $$;

-- Authorization is cached on a subscribed socket. Rotate topic names on access
-- changes so current members move to a new channel that removed users cannot join.
create or replace function public.workspace_rotate_access() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='room_workspaces' then
    if old.shared is distinct from new.shared then new.realtime_epoch:=gen_random_uuid(); end if;
    return new;
  elsif tg_table_name='profiles' then
    if old.plan is distinct from new.plan then update room_workspaces set realtime_epoch=gen_random_uuid() where owner_id=new.id; end if;
  else
    update room_workspaces set realtime_epoch=gen_random_uuid() where id=case when tg_op='DELETE' then old.workspace_id else new.workspace_id end;
  end if;
  return null;
end $$;
drop trigger if exists workspace_rotate_shared on public.room_workspaces;
create trigger workspace_rotate_shared before update of shared on public.room_workspaces for each row execute function public.workspace_rotate_access();
drop trigger if exists workspace_rotate_members on public.workspace_members;
create trigger workspace_rotate_members after insert or update or delete on public.workspace_members for each row execute function public.workspace_rotate_access();
drop trigger if exists workspace_rotate_plan on public.profiles;
create trigger workspace_rotate_plan after update of plan on public.profiles for each row execute function public.workspace_rotate_access();
drop trigger if exists workspace_room_changed on public.room_workspaces;
create trigger workspace_room_changed after insert or update or delete on public.room_workspaces for each row execute function public.workspace_notify_change();
drop trigger if exists workspace_comment_changed on public.workspace_comments;
create trigger workspace_comment_changed after insert or update or delete on public.workspace_comments for each row execute function public.workspace_notify_change();
revoke all on function public.workspace_rotate_access(),public.workspace_notify_change() from public,anon,authenticated;

-- Keep comments outside layout revisions: posting cannot overwrite a room edit.
create or replace function public.dormscape_workspace_comment(p_actor uuid,p_id uuid,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare w public.room_workspaces; member_role text; root public.workspace_comments; result_id uuid; body text; target text;
begin
  select * into w from room_workspaces where id=p_id for update;
  select role into member_role from workspace_members where workspace_id=p_id and user_id=p_actor;
  if w.id is null or member_role is null then return jsonb_build_object('error','Room not found or access removed.','status',404); end if;
  if member_role<>'owner' and (not w.shared or not exists(select 1 from profiles where id=w.owner_id and plan='pro')) then
    return jsonb_build_object('error','Shared comments are unavailable until the host has Pro.','status',403);
  end if;
  if p_action='comment' then
    body:=btrim(p_payload->>'body'); target:=p_payload->>'target';
    if body is null or char_length(body) not between 1 and 1500 or target is null or char_length(target)>120 then
      return jsonb_build_object('error','Write a comment of up to 1,500 characters.','status',400); end if;
    if (select count(*) from workspace_comments where workspace_id=p_id)>=1000 then
      return jsonb_build_object('error','This room has reached its comment limit.','status',409); end if;
    if p_payload->>'parent_id' is not null then
      select * into root from workspace_comments where id=(p_payload->>'parent_id')::uuid and workspace_id=p_id and parent_id is null;
      if root.id is null then return jsonb_build_object('error','Conversation not found.','status',404); end if;
      if root.resolved then return jsonb_build_object('error','Reopen this conversation before replying.','status',409); end if;
      target:=root.target;
    end if;
    insert into workspace_comments(workspace_id,user_id,body,target,parent_id) values(p_id,p_actor,body,target,root.id) returning id into result_id;
    return jsonb_build_object('ok',true,'id',result_id);
  elsif p_action='resolve' then
    select * into root from workspace_comments where id=(p_payload->>'comment_id')::uuid and workspace_id=p_id and parent_id is null;
    if root.id is null then return jsonb_build_object('error','Conversation not found.','status',404); end if;
    if member_role='commenter' and root.user_id<>p_actor then
      return jsonb_build_object('error','Only the author or a room editor can resolve this conversation.','status',403); end if;
    update workspace_comments set resolved=(p_payload->>'resolved')::boolean where id=root.id;
    return jsonb_build_object('ok',true);
  end if;
  return jsonb_build_object('error','Unknown comment action.','status',400);
end $$;
revoke all on function public.dormscape_workspace_comment(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dormscape_workspace_comment(uuid,uuid,text,jsonb) to service_role;
commit;
