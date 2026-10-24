-- Hall Finder roommate mode, 2026-10-24. NOT APPLIED. Review, then run once in the Supabase
-- SQL editor for project mvrogmmqglsrhoagfjvs.
--
-- In a My Room, each member keeps their own Hall Finder places (the buildings they have
-- classes in, the days they go, and any pins they drop), and the room ranks halls by
-- everyone's weekly walk together or by the fairest split. One row per member per room.
-- Like every workspace table, the app reads and writes this only from authenticated
-- server routes with the service role (/api/workspaces/[id]/halls), which check
-- membership and let each person change only their own row. No browser access.
-- Until this runs, the room's Halls section says it isn't available yet; nothing else changes.
--
-- places: [{ "placeId": "willard-building", "days": 21, "label": "ECON 102" } | { "pin": [-77.86, 40.80], "days": 31 }]
-- Roommates see each other's buildings and days only; course labels and pin locations
-- are never sent to anyone but the member who added them.

begin;

create table public.workspace_hall_places (
  workspace_id uuid not null references public.room_workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  places jsonb not null default '[]'::jsonb check (jsonb_typeof(places) = 'array' and jsonb_array_length(places) <= 20),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.workspace_hall_places_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger workspace_hall_places_touch
before update on public.workspace_hall_places
for each row execute function public.workspace_hall_places_touch();

-- Leaving a room, or being removed from it, takes your places with you.
create or replace function public.workspace_hall_places_member_gone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.workspace_hall_places where workspace_id = old.workspace_id and user_id = old.user_id;
  return old;
end;
$$;

create trigger workspace_hall_places_member_gone
after delete on public.workspace_members
for each row execute function public.workspace_hall_places_member_gone();

alter table public.workspace_hall_places enable row level security;
-- No policies: service role only, as for the other workspace tables.
revoke all on public.workspace_hall_places from anon, authenticated;
revoke execute on function public.workspace_hall_places_member_gone() from public, anon, authenticated;

commit;
