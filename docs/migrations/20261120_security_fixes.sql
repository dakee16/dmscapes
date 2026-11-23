-- Security fixes, 2026-11-20. NOT APPLIED. Review, then run once in the Supabase SQL editor
-- (project mvrogmmqglsrhoagfjvs). Safe to re-run. Each step skips itself if its table isn't there.
-- Run docs/security-check.sql before and after: afterwards it should return no rows (if it still
-- lists credit or session functions, also run 20261004_security_hardening.sql).

begin;

-- 1. 20261102_growth_loops.sql ended with a sample creator code after its commit ('jane': free Plus
--    for 200 accounts until mid-2027), so pasting the whole file created it. Switch it off if it
--    exists. Upgrades already redeemed stay.
do $$ begin
  if to_regclass('public.creator_codes') is not null then
    update public.creator_codes set active = false where code = 'jane' and creator = 'Jane Doe (@janedorms)';
  end if;
end $$;

-- 2. Only the server writes Hall Finder setups (app/api/hall-finder/setups checks Plus, the
--    50-setup cap and the places). Signed-in browsers could write the table with their own login,
--    skipping all three. Reading their own rows stays allowed.
do $$ begin
  if to_regclass('public.hall_finder_setups') is not null then
    revoke insert, update, delete on public.hall_finder_setups from anon, authenticated;
  end if;
end $$;

-- 3. No browser deletes a profile (account deletion runs on the server). A deleted profile is
--    recreated fresh on the next sign-in, which would reset free-design use and referral eligibility.
revoke delete on public.profiles from anon, authenticated;

-- 4. Usernames: the rule the site already enforces (3-20 letters, numbers, . or _), now in the
--    database too, because the browser writes this column directly. NOT VALID: existing usernames
--    aren't checked, only new writes.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9._]{3,20}$') not valid;

commit;
