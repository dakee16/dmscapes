-- Growth loops (Phase C), 2026-11-02. NOT APPLIED. Review, then run once in the
-- Supabase SQL editor for project mvrogmmqglsrhoagfjvs. Safe to re-run.
--
-- 1. Referrals: "Give a friend a free design, get one yourself".
--    profiles.referral_code     the user's invite code (dormscape.us/?ref=CODE), made on first use.
--    profiles.referred_by       who invited this account. Set once, by /api/referrals/claim, only for
--                               an account under 48 hours old that hasn't designed yet.
--    profiles.referral_rewarded_at  when this account's first design paid out a free design to it
--                               and (up to 10 a month) to the person who invited it.
--    The browser can't write any of these: 0011 limits browser updates to granted columns.
--
-- 2. Hall gallery: layouts students choose to show, anonymously, on their hall's page.
--    saved_rooms.gallery_at         when the owner added it (null = not in the gallery).
--    saved_rooms.gallery_hidden_at  set by the owner of dormscape to pull one from the gallery:
--      update public.saved_rooms set gallery_hidden_at = now() where id = '<room id>';
--    saved_rooms stays service-role only (0001), so only the server reads and writes these.
--
-- 3. Creator codes: a code that unlocks Plus free, once per account.
--    Add a code (lowercase; the site lowercases what people type):
--      insert into public.creator_codes (code, creator, max_redemptions, expires_at)
--      values ('jane', 'Jane Doe (@janedorms)', 200, '2027-06-30');
--    Turn one off:  update public.creator_codes set active = false where code = 'jane';
--    Redemptions per code:
--      select code, count(*) from public.creator_redemptions group by code order by 2 desc;

begin;

-- 1. Referrals
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references auth.users (id) on delete set null,
  add column if not exists referral_rewarded_at timestamptz;

create index if not exists profiles_referred_by_idx on public.profiles (referred_by) where referred_by is not null;

-- 2. Hall gallery
alter table public.saved_rooms
  add column if not exists gallery_at timestamptz,
  add column if not exists gallery_hidden_at timestamptz;

create index if not exists saved_rooms_gallery_idx on public.saved_rooms (college_id, dorm_id, gallery_at desc)
  where gallery_at is not null and gallery_hidden_at is null;

-- 3. Creator codes
create table if not exists public.creator_codes (
  code text primary key check (code = lower(code) and code ~ '^[a-z0-9_-]{2,32}$'),
  creator text not null,
  -- null = no limit
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One free Plus per account, whichever code it came from.
create table if not exists public.creator_redemptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null references public.creator_codes (code) on update cascade,
  redeemed_at timestamptz not null default now()
);

create index if not exists creator_redemptions_code_idx on public.creator_redemptions (code);

-- Service-role only, like saved_rooms: RLS on, no policies.
alter table public.creator_codes enable row level security;
alter table public.creator_redemptions enable row level security;
revoke all on public.creator_codes, public.creator_redemptions from anon, authenticated;

commit;
