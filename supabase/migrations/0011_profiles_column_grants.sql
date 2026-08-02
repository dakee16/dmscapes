-- SECURITY FIX: privilege escalation via unrestricted profile UPDATE.
--
-- THREAT
-- The "profiles: update own" policy (0002) restricts WHICH ROW a signed-in user
-- may update (auth.uid() = id) but not WHICH COLUMNS. Supabase grants the
-- `authenticated` role table-level UPDATE on public tables by default, so a
-- row-only policy lets any logged-in user rewrite billing columns on their own
-- row straight from the browser (anon key + their own JWT):
--
--   update public.profiles
--      set plan = 'pro',
--          plan_credits_remaining = 2147483647,
--          plus_features_unlocked = true
--    where id = auth.uid();
--
-- That self-grants Pro / unlimited credits and bypasses Stripe entirely
-- (Broken Access Control, OWASP A01).
--
-- FIX
-- Constrain the client's UPDATE to exactly the columns the app edits from the
-- browser today: `username` (auth modal) and `full_name` / `phone` (account
-- settings). Everything else (plan, plan_credits_remaining,
-- plus_features_unlocked, plan_purchased_at, stripe_customer_id, email,
-- auth_provider, id, created_at) becomes writable only by the service role,
-- which the Stripe webhook uses and which bypasses RLS and column grants.
--
-- The RLS row policy is unchanged, so users still update only their own row,
-- and reads are unaffected. INSERT stays as-is: the primary key + the
-- "auth.uid() = id" insert check already make a plan-inflating insert impossible
-- (the row is pre-created on signup by handle_new_user, so any client insert
-- collides on the PK).
--
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

revoke update on public.profiles from anon, authenticated;

grant update (username, full_name, phone)
  on public.profiles to authenticated;
