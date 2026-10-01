-- Run in the branch preview's existing Supabase project. No accounts are
-- deleted by this migration. It installs cleanup for FUTURE confirmed deletes.
begin;

create table if not exists public.site_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug','content','product','account','other')),
  description text not null check (char_length(description) between 20 and 5000),
  email text check (email is null or char_length(email) <= 254),
  page_path text check (page_path is null or char_length(page_path) <= 500),
  status text not null default 'new' check (status in ('new','reviewing','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists site_reports_queue on public.site_reports(status, created_at desc);
alter table public.site_reports enable row level security;
revoke all on public.site_reports from public, anon, authenticated;
grant select, insert, update, delete on public.site_reports to service_role;

-- Runs inside auth.admin.deleteUser's database transaction. Any failure rolls
-- back BOTH the auth deletion and this cleanup, avoiding half-deleted accounts.
-- Optional historical tables are handled only when installed. Unexpected
-- constraints are not bypassed; investigate them before retrying deletion.
create or replace function public.dormscape_cleanup_deleted_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare table_name text;
begin
  -- Workspaces and their children already have cascading foreign keys.
  -- Explicitly remove owned workspaces first for deterministic cleanup order.
  if to_regclass('public.room_workspaces') is not null then
    delete from public.room_workspaces where owner_id = old.id;
  end if;
  foreach table_name in array array[
    'workspace_comments', 'workspace_members', 'room_review_comments',
    'purchase_feedback', 'purchase_surveys', 'room_submissions', 'saved_rooms'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('delete from public.%I where user_id = $1', table_name) using old.id;
    end if;
  end loop;
  -- Keep the report for investigation, without its account/reply-email link.
  update public.site_reports set user_id = null, email = null
    where user_id = old.id or lower(email) = lower(old.email);
  delete from public.profiles where id = old.id;
  return old;
end;
$$;
revoke all on function public.dormscape_cleanup_deleted_account() from public, anon, authenticated, service_role;
drop trigger if exists dormscape_account_cleanup on auth.users;
create trigger dormscape_account_cleanup before delete on auth.users
  for each row execute function public.dormscape_cleanup_deleted_account();

-- The API fails closed until the cleanup trigger is actually installed.
create or replace function public.dormscape_account_deletion_ready()
returns boolean language sql security definer set search_path = '' as $$
  select exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'dormscape_account_cleanup'
      and tgrelid = 'auth.users'::regclass
      and tgfoid = 'public.dormscape_cleanup_deleted_account()'::regprocedure
      and tgenabled = 'O'
  ) and to_regclass('public.profiles') is not null
    and to_regclass('public.saved_rooms') is not null;
$$;
revoke all on function public.dormscape_account_deletion_ready() from public, anon, authenticated;
grant execute on function public.dormscape_account_deletion_ready() to service_role;
commit;
