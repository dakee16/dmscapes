-- Three-tier plan model: free / plus / pro. Replaces the old binary free/plus
-- flag from 0008. Clean structural rebuild: there are no real purchases to
-- preserve, so any test plan data is reset to 'free'.
--
--   Free  : unlimited room-plan generation, 5 of 9 vibes, save + share. No
--           exports, comparison, or priority.
--   Plus  : $7.99 once. Grants 5 "plan credits" (one spent per generated plan),
--           all 9 vibes, and all premium features unlocked permanently (they
--           stay unlocked even at 0 credits). Recharge +5 credits for $4.99.
--   Pro   : $19.99 once. Unlimited credits (no tracking), all vibes, all
--           features, forever.
--
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

-- 1. Widen the plan check to three values. Drop the old two-value constraint
--    first, reset any leftover test data, then re-add the three-value check.
alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles set plan = 'free' where plan is distinct from 'free';

-- plan_credits_remaining: meaningful only for Plus (5, or 5 + 5 per recharge).
-- Null for free and pro. plus_features_unlocked: set true the first time a user
-- ever buys Plus and never unset, so premium features survive credit depletion.
alter table public.profiles
  add column if not exists plan_credits_remaining integer,
  add column if not exists plus_features_unlocked boolean not null default false;

-- Reset test/dummy state so nothing is left half-configured after the rebuild.
update public.profiles
  set plan_credits_remaining = null,
      plus_features_unlocked = false;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'plus', 'pro'));

-- 2. Atomic credit consumption. Returns:
--      -1                 => blocked (Plus user with no credits left)
--      2147483647         => allowed with no charge (free / pro / no profile)
--      >= 0               => allowed; the new remaining credit count (Plus)
--    Runs as SECURITY DEFINER so the service role can call it; row-locked so
--    concurrent generations can't double-spend a single credit.
create or replace function public.consume_plan_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_remaining integer;
begin
  select plan, plan_credits_remaining
    into v_plan, v_remaining
    from public.profiles
    where id = p_user_id
    for update;
  if not found then
    return 2147483647;               -- no profile: treat as free/unlimited
  end if;
  if v_plan is distinct from 'plus' then
    return 2147483647;               -- free and pro never consume credits
  end if;
  if coalesce(v_remaining, 0) <= 0 then
    return -1;                        -- out of credits: block
  end if;
  update public.profiles
    set plan_credits_remaining = v_remaining - 1
    where id = p_user_id;
  return v_remaining - 1;
end;
$$;

revoke all on function public.consume_plan_credit(uuid) from public;
grant execute on function public.consume_plan_credit(uuid) to service_role;

-- 3. Atomic credit grant (used by the recharge webhook, and by the initial Plus
--    grant as a set). Adds p_amount to the current balance and returns the new
--    total. SECURITY DEFINER, service-role only.
create or replace function public.add_plan_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new integer;
begin
  update public.profiles
    set plan_credits_remaining = coalesce(plan_credits_remaining, 0) + p_amount
    where id = p_user_id
    returning plan_credits_remaining into v_new;
  return coalesce(v_new, 0);
end;
$$;

revoke all on function public.add_plan_credits(uuid, integer) from public;
grant execute on function public.add_plan_credits(uuid, integer) to service_role;

-- 4. Webhook idempotency ledger. Stripe delivers events at least once, so a
--    replay must not double-apply a purchase (critical for recharges, which
--    increment). The webhook records each processed checkout session id here and
--    skips anything already present.
create table if not exists public.processed_stripe_events (
  event_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
-- No policies: only the service role (which bypasses RLS) ever touches this.
