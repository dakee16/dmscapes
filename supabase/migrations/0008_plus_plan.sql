-- Dormscape Plus: a one-time paid tier ($4.99) unlocking unlimited saved
-- designs, PDF export, the comparison view, and priority school requests.
--
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

-- 1. Plan on the profile. Everyone starts on 'free'; the Stripe webhook flips
--    it to 'plus' after a verified one-time payment. stripe_customer_id and the
--    purchase timestamp are stored for support/reconciliation.
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists plan_purchased_at timestamptz,
  add column if not exists stripe_customer_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'plus'));
  end if;
end $$;

-- 2. Priority flag on school requests. Set true when a Plus member submits, so
--    those requests get processed first. user_id links the request to the
--    submitter's account (null for logged-out submissions).
alter table public.room_submissions
  add column if not exists priority boolean not null default false,
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- Prioritized queue for the admin (Supabase dashboard): Plus requests float to
-- the top, then oldest-first within each band so nothing waits forever.
create or replace view public.room_submissions_queue as
  select *
  from public.room_submissions
  order by priority desc, created_at asc;

create index if not exists room_submissions_priority_idx
  on public.room_submissions (priority desc, created_at asc);
