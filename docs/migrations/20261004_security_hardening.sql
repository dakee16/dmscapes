-- Security hardening, 2026-10-04. NOT APPLIED. Review, then run once in the
-- Supabase SQL editor for project mvrogmmqglsrhoagfjvs.
--
-- Found by the Supabase security advisor on the live project and a review of
-- the API routes:
--
-- 1. The credit and session functions are SECURITY DEFINER and are still
--    executable by the anon and authenticated roles through /rest/v1/rpc.
--    Migrations 0012 and 0015 revoked EXECUTE from PUBLIC only, but Supabase's
--    default privileges also grant EXECUTE to anon and authenticated directly,
--    so those grants survived. These functions trust the user id they are
--    given, so they must only be callable by the server (service role).
-- 2. public.room_submissions_queue is a view over room_submissions that runs
--    with its owner's rights, so reading it through the API skips the table's
--    RLS.
-- 3. The profiles INSERT policy checks only that the row is the caller's own,
--    not which columns are set, so a client recreating a missing profile row
--    could set billing columns. The app only ever inserts id, email and
--    auth_provider.
--
-- The app is unaffected: every caller of these functions uses the service-role
-- key (app/api/session/enforce, app/api/account/delete), trigger functions
-- need no EXECUTE grant for the user firing them, and lib/auth-context only
-- inserts the three granted columns.

begin;

-- 1. Server-only functions.
revoke execute on function public.add_flex_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function public.add_recharge_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function public.consume_plan_credit(uuid) from public, anon, authenticated;
revoke execute on function public.consume_save_credit(uuid) from public, anon, authenticated;
revoke execute on function public.refund_save_credit(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_session_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_flex_credits(uuid, integer) to service_role;
grant execute on function public.add_recharge_credits(uuid, integer) to service_role;
grant execute on function public.consume_plan_credit(uuid) to service_role;
grant execute on function public.consume_save_credit(uuid) to service_role;
grant execute on function public.refund_save_credit(uuid) to service_role;
grant execute on function public.enforce_session_limit(uuid, integer) to service_role;

-- Trigger and event-trigger functions are never meant to be called over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- New functions in public start closed; grant EXECUTE explicitly when a
-- function is meant for signed-in users (as workspace_realtime_access does).
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- 2. The admin queue view respects the table's RLS and is not served to clients.
alter view public.room_submissions_queue set (security_invoker = true);
revoke all on public.room_submissions_queue from anon, authenticated;

-- 3. Clients may only (re)create their profile row with these columns.
revoke insert on public.profiles from anon, authenticated;
grant insert (id, email, auth_provider) on public.profiles to authenticated;

commit;

-- After running: Database > Advisors > Security should no longer list these
-- functions or the view. Also turn on Auth > Providers > Email > "Prevent use
-- of leaked passwords" (the advisor's other warning; it is a dashboard setting).
