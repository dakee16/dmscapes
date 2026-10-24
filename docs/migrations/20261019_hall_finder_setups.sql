-- Hall Finder saved setups, 2026-10-19. NOT APPLIED. Review, then run once in the
-- Supabase SQL editor for project mvrogmmqglsrhoagfjvs.
--
-- A Plus or Pro member saves the places, days and filters they ranked halls with
-- (design-handoff/hall-finder plan.md "Saved setups"), and can share one read-only
-- by token. The app reads and writes this table only from /api/hall-finder/setups
-- and the /hall-finder/s/[token] page, both with the service-role key, so RLS here
-- is defence in depth: owners can do everything to their own rows, nobody else can
-- read them through the API (a share link is resolved on the server, not by RLS).
-- Until this runs, Save and Share stay hidden and everything else works.
--
-- places:  [{ "placeId": "willard-building", "days": 21, "label": "ECON 102" } | { "pin": [-77.86, 40.80], "days": 31 }]
-- filters: { "firstYear": false, "ac": true, "singles": false, "doubles": false }

begin;

create table public.hall_finder_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  college_id text not null check (college_id ~ '^[a-z0-9-]{1,80}$'),
  name text not null default 'My classes' check (char_length(name) between 1 and 80),
  places jsonb not null default '[]'::jsonb check (jsonb_typeof(places) = 'array' and jsonb_array_length(places) <= 20),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  share_token text unique check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{16,64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hall_finder_setups_user_idx on public.hall_finder_setups (user_id, updated_at desc);

create or replace function public.hall_finder_setups_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger hall_finder_setups_touch
before update on public.hall_finder_setups
for each row execute function public.hall_finder_setups_touch();

alter table public.hall_finder_setups enable row level security;

-- Owners only; no public read.
create policy "hall finder setups: owners read" on public.hall_finder_setups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "hall finder setups: owners insert" on public.hall_finder_setups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "hall finder setups: owners update" on public.hall_finder_setups
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "hall finder setups: owners delete" on public.hall_finder_setups
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.hall_finder_setups from anon;

commit;
