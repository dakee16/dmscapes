-- PROPOSED, NOT APPLIED. Show to the owner before running anything.
-- Run after 20260930_workspace_collaboration.sql. Safe to re-run.
--
-- My Room "Versions" (designs/my-room/Members) shows who made each change and a
-- one-line summary ("Maya moved her desk chair"). Today workspace_versions only
-- stores id, revision, name and created_at, so the panel shows the version name
-- and its age. This adds the two columns and fills the author automatically.
--
-- Two follow-ups outside this file:
--   1. In public.dormscape_workspace_action (latest definition in
--      20260928_email_invitations.sql), add as its first statement:
--          perform set_config('dormscape.actor', p_actor::text, true);
--      so the trigger below knows who saved, checkpointed or restored.
--   2. In app/api/workspaces/[id]/route.ts, select "id,revision,name,created_at,created_by,summary"
--      from workspace_versions and map created_by to a display name the same way
--      comments are, then extend WorkspaceVersion in lib/workspace.ts.
-- A summary needs the client to describe its edit; until then it stays null and
-- the panel keeps showing the version name.
begin;
alter table public.workspace_versions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.workspace_versions add column if not exists summary text check (summary is null or char_length(summary) <= 140);

create or replace function public.workspace_version_author() returns trigger
language plpgsql security definer set search_path=public as $$
declare actor text := nullif(current_setting('dormscape.actor', true), '');
begin
  if new.created_by is null and actor is not null then
    begin new.created_by := actor::uuid; exception when invalid_text_representation then null; end;
  end if;
  return new;
end $$;
revoke all on function public.workspace_version_author() from public, anon, authenticated;

drop trigger if exists workspace_versions_author on public.workspace_versions;
create trigger workspace_versions_author before insert on public.workspace_versions
  for each row execute function public.workspace_version_author();
commit;
