-- Apply in the branch's Supabase environment before testing shared comments.
-- Existing saved_rooms and its public share-link behavior are unchanged.
create table if not exists public.room_review_comments (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.saved_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1200),
  alternative_id text check (alternative_id is null or char_length(alternative_id) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists room_review_comments_room_date on public.room_review_comments(room_id,created_at);
alter table public.room_review_comments enable row level security;
-- Access goes through the scoped API. Never expose user IDs through anonymous reads.
revoke all on table public.room_review_comments from anon, authenticated;
grant select, insert, delete on table public.room_review_comments to service_role;
