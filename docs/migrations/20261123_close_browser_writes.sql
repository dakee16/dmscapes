-- Close direct browser writes, 2026-11-23. NOT APPLIED. Review, then run once in the Supabase SQL
-- editor (project mvrogmmqglsrhoagfjvs). Safe to re-run. Run after 20261120_security_fixes.sql.
--
-- Supabase gives the browser roles (anon = anyone, authenticated = signed-in) full write rights on
-- every new table. Row-level security still refuses writes unless a policy allows them, but the
-- site never writes from the browser: every insert, update and delete goes through our server with
-- the service key. So the browser roles lose write rights on every public table, and new tables
-- start without them. docs/security-check.sql listed these (2026-11-23): contact_submissions,
-- photo_renders, processed_stripe_events, product_clicks, purchase_feedback, purchase_surveys,
-- room_submissions, saved_rooms.
--
-- profiles is left out on purpose: the browser updates a few of its own columns (username, name,
-- phone, marketing opt-in), and revoking table-level UPDATE would revoke those column grants too.
-- Its other gaps were closed by 20261004 (insert columns) and 20261120 (delete).
-- Reading is unchanged. The server (service role) is unaffected.

begin;

do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'profiles'
  loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t.relname);
  end loop;
end $$;

-- Tables created later (from the SQL editor, as postgres) start without browser write rights.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate on tables from anon, authenticated;

commit;
