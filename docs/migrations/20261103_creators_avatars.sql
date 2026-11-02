-- Profile photos and creators, 2026-11-03. NOT APPLIED. Review, then run once in
-- the Supabase SQL editor for project mvrogmmqglsrhoagfjvs. Safe to re-run.
-- Needs 20261102_growth_loops.sql first (creator_codes).
--
-- 1. Profile photos: profiles.avatar_url, and a public "avatars" bucket that only
--    takes small images (256 KB; WebP, JPEG or PNG). The browser shrinks a photo to
--    256 px before it's sent; /api/account/avatar checks the file again and is the
--    only writer (service role).
--
-- 2. Creators: someone with 10,000+ followers on Instagram or TikTok applies in
--    Account settings. They put a short code (creators.verify_code) in their bio so
--    you can see the account is theirs. To review applications:
--      select c.applied_at, p.username, c.platform, c.handle, c.followers, c.verify_code, c.status
--      from public.creators c join public.profiles p on p.id = c.user_id
--      where c.status = 'pending' order by c.applied_at;
--    Open instagram.com/<handle> or tiktok.com/@<handle>, check the follower count
--    and that the bio shows the verify code, then approve or reject:
--      update public.creators set status = 'approved' where handle = 'janedorms';
--      update public.creators set status = 'rejected' where handle = 'janedorms';
--    Approving gives them the Creator badge (profiles.creator_at) and a creator code
--    named after their username (dots become dashes), which unlocks Plus free for
--    their followers at dormscape.us/c/<code>. Setting an approved creator back to
--    'rejected' removes the badge and switches the code off.

begin;

-- 1. Profile photos
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2. Creators
alter table public.profiles add column if not exists creator_at timestamptz;

create table if not exists public.creators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok')),
  handle text not null check (handle ~ '^[A-Za-z0-9._]{1,30}$'),
  followers integer not null check (followers >= 0),
  verify_code text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.creators enable row level security;
revoke all on public.creators from anon, authenticated;

alter table public.creator_codes add column if not exists owner_id uuid references auth.users (id) on delete set null;
create unique index if not exists creator_codes_owner_idx on public.creator_codes (owner_id) where owner_id is not null;

-- One update on creators.status does the rest: badge, code, and undoing both.
create or replace function public.creator_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    new.reviewed_at := now();
  end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles set creator_at = coalesce(creator_at, now()) where id = new.user_id
    returning username into uname;
    if uname is not null then
      insert into public.creator_codes (code, creator, owner_id)
      values (regexp_replace(lower(uname), '[^a-z0-9_-]', '-', 'g'), '@' || new.handle || ' (' || new.platform || ')', new.user_id)
      on conflict (code) do update set active = true, owner_id = excluded.owner_id
        where public.creator_codes.owner_id is null or public.creator_codes.owner_id = excluded.owner_id;
      update public.creator_codes set active = true where owner_id = new.user_id;
    end if;
  elsif old.status = 'approved' and new.status <> 'approved' then
    update public.profiles set creator_at = null where id = new.user_id;
    update public.creator_codes set active = false where owner_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.creator_review() from public, anon, authenticated;

drop trigger if exists creator_review on public.creators;
create trigger creator_review before update of status on public.creators
  for each row execute function public.creator_review();

commit;
