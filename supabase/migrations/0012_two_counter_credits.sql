-- Two independent credit counters: room plans and saved designs.
--
-- Supersedes the single plan-credit model from 0010. Plans and saves are now
-- metered separately on every non-Pro tier, and the two counters never share a
-- pool. No production purchases exist yet, so any test/dummy state is reset
-- cleanly as part of this rebuild.
--
--   Free : 1 lifetime room plan + 1 lifetime saved design, tracked independently
--          via monotonic used-counters (free_plans_used / free_saves_used), hard
--          cap of 1 each. These are lifetime caps, not per-session.
--   Plus : 5 plan credits + 5 save credits, as two separate counters. Each new
--          plan spends one plan credit; each saved design spends one save credit.
--          A $4.99 recharge adds 5 to BOTH counters at once. Premium features
--          unlock permanently (plus_features_unlocked) and keep working even
--          after either counter reaches 0.
--   Pro  : unlimited plans and saves, no counters at all.
--
-- Column safety: 0011 revoked table-level UPDATE from anon/authenticated and
-- granted only (username, full_name, phone). The new counter columns below get
-- no such grant, so they are writable only by the service role, which runs the
-- SECURITY DEFINER functions here and the Stripe webhook. A signed-in user can
-- never inflate their own counters from the browser.
--
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

-- 1. Columns.
--    save_credits_remaining mirrors plan_credits_remaining: Plus-only, null for
--    free and pro. free_plans_used / free_saves_used are the free-tier lifetime
--    meters (irrelevant, and left at 0, once a user upgrades to a paid tier).
alter table public.profiles
  add column if not exists save_credits_remaining integer,
  add column if not exists free_plans_used integer not null default 0,
  add column if not exists free_saves_used integer not null default 0;

-- Reset the new counters so no half-configured rows survive the rebuild.
update public.profiles
  set save_credits_remaining = null,
      free_plans_used = 0,
      free_saves_used = 0;

-- Belt-and-suspenders: give any existing Plus row a matching save counter (there
-- are no real Plus users yet, but this keeps the two counters in lockstep).
update public.profiles
  set save_credits_remaining = coalesce(plan_credits_remaining, 5)
  where plan = 'plus';

-- 2. consume_plan_credit. Now meters FREE (1 lifetime plan) in addition to Plus.
--    Returns:
--      -1                 => blocked (out of plan credits / free plan used)
--      2147483647         => allowed, unmetered (pro, or no profile row)
--      >= 0               => allowed; the new remaining plan count
--    SECURITY DEFINER + row lock so concurrent generations can't double-spend.
create or replace function public.consume_plan_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_remaining integer;
  v_used integer;
begin
  select plan, plan_credits_remaining, free_plans_used
    into v_plan, v_remaining, v_used
    from public.profiles
    where id = p_user_id
    for update;
  if not found then
    return 2147483647;                 -- no profile: treat as unlimited
  end if;
  if v_plan = 'pro' then
    return 2147483647;                 -- pro never consumes
  end if;
  if v_plan = 'plus' then
    if coalesce(v_remaining, 0) <= 0 then
      return -1;                        -- out of plan credits
    end if;
    update public.profiles
      set plan_credits_remaining = v_remaining - 1
      where id = p_user_id;
    return v_remaining - 1;
  end if;
  -- free (or any non-paid value): hard cap of 1 lifetime plan.
  if coalesce(v_used, 0) >= 1 then
    return -1;
  end if;
  update public.profiles
    set free_plans_used = coalesce(v_used, 0) + 1
    where id = p_user_id;
  return 1 - (coalesce(v_used, 0) + 1); -- remaining free plans (0)
end;
$$;

-- 3. consume_save_credit. The exact mirror of consume_plan_credit for saves.
--    Free is capped at 1 lifetime saved design; Plus spends save credits; Pro is
--    unlimited. Independent of plan credits: a user can be out of one and not
--    the other.
create or replace function public.consume_save_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_remaining integer;
  v_used integer;
begin
  select plan, save_credits_remaining, free_saves_used
    into v_plan, v_remaining, v_used
    from public.profiles
    where id = p_user_id
    for update;
  if not found then
    return 2147483647;
  end if;
  if v_plan = 'pro' then
    return 2147483647;
  end if;
  if v_plan = 'plus' then
    if coalesce(v_remaining, 0) <= 0 then
      return -1;
    end if;
    update public.profiles
      set save_credits_remaining = v_remaining - 1
      where id = p_user_id;
    return v_remaining - 1;
  end if;
  if coalesce(v_used, 0) >= 1 then
    return -1;
  end if;
  update public.profiles
    set free_saves_used = coalesce(v_used, 0) + 1
    where id = p_user_id;
  return 1 - (coalesce(v_used, 0) + 1);
end;
$$;

-- 4. refund_save_credit. Undo one save consume when the row insert fails right
--    after (so a failed save never silently burns a credit). Tier-aware: gives
--    a Plus user a credit back, decrements a free user's lifetime meter, no-ops
--    for Pro / no profile.
create or replace function public.refund_save_credit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
begin
  select plan into v_plan
    from public.profiles
    where id = p_user_id
    for update;
  if not found then
    return;
  end if;
  if v_plan = 'plus' then
    update public.profiles
      set save_credits_remaining = coalesce(save_credits_remaining, 0) + 1
      where id = p_user_id;
  elsif v_plan is distinct from 'pro' then
    update public.profiles
      set free_saves_used = greatest(0, coalesce(free_saves_used, 0) - 1)
      where id = p_user_id;
  end if;
end;
$$;

-- 5. add_recharge_credits. A Plus recharge tops up BOTH counters by p_amount at
--    once (they were bought together as a bundle). Replaces the old single-pool
--    add_plan_credits from 0010.
create or replace function public.add_recharge_credits(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
    set plan_credits_remaining = coalesce(plan_credits_remaining, 0) + p_amount,
        save_credits_remaining = coalesce(save_credits_remaining, 0) + p_amount
    where id = p_user_id;
end;
$$;

drop function if exists public.add_plan_credits(uuid, integer);

-- 6. Grants. All four functions are service-role only; the app calls them from
--    server routes (service client) and the Stripe webhook, never the browser.
revoke all on function public.consume_plan_credit(uuid) from public;
revoke all on function public.consume_save_credit(uuid) from public;
revoke all on function public.refund_save_credit(uuid) from public;
revoke all on function public.add_recharge_credits(uuid, integer) from public;
grant execute on function public.consume_plan_credit(uuid) to service_role;
grant execute on function public.consume_save_credit(uuid) to service_role;
grant execute on function public.refund_save_credit(uuid) to service_role;
grant execute on function public.add_recharge_credits(uuid, integer) to service_role;
