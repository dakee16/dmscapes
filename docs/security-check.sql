-- dormscape security check. READ-ONLY: it reads permission settings and changes nothing.
-- Paste the whole file into the Supabase SQL editor (project mvrogmmqglsrhoagfjvs) and Run.
-- It should return NO ROWS. Each row is something any visitor ("anyone") or any signed-in
-- user can do from their browser console with their own login, bypassing our API.
--
-- function: the credit, session and account functions trust the user id they're given, so a
--   row here lets anyone add credits to themselves or sign any account out everywhere.
--   Fix: apply docs/migrations/20261004_security_hardening.sql.
-- table: a table or view without row-level security that browsers can reach.
-- profile column: a profiles column users may set on their own row beyond the expected
--   username, full_name, phone and marketing_opt_in_at (e.g. plan or credits = free Pro).
-- browser write: a table browsers may insert, update or delete rows in directly (with row-level
--   security, only rows its policies allow, but skipping every check our API makes). The site
--   writes everything through the server, so none are expected.
--   Fix: docs/migrations/20261120_security_fixes.sql covers hall_finder_setups and profiles;
--   send any other row to whoever maintains the site.
select 'function' as problem, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as detail,
       case when has_function_privilege('anon', p.oid, 'execute') then 'anyone' else 'signed-in users' end as who
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
  and p.proname <> 'workspace_realtime_access' -- meant to be callable: it decides who can join a room's live channel
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
union all
select 'table', c.relname,
       case when has_table_privilege('anon', c.oid, 'select,insert,update,delete') then 'anyone' else 'signed-in users' end
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p') and not c.relrowsecurity
  and (has_table_privilege('anon', c.oid, 'select,insert,update,delete') or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete'))
  and not (c.relkind = 'v' and coalesce((select option_value = 'true' from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'), false))
union all
select 'profile column', privilege_type || ' ' || column_name, grantee
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles' and grantee in ('authenticated', 'anon', 'PUBLIC')
  and privilege_type in ('UPDATE', 'INSERT')
  and not (privilege_type = 'UPDATE' and column_name in ('username', 'full_name', 'phone', 'marketing_opt_in_at'))
  and not (privilege_type = 'INSERT' and column_name in ('id', 'email', 'auth_provider'))
union all
select 'browser write', c.relname || ': ' || concat_ws(', ',
         case when has_table_privilege(r.rolname, c.oid, 'insert') then 'insert' end,
         case when has_table_privilege(r.rolname, c.oid, 'update') then 'update' end,
         case when has_table_privilege(r.rolname, c.oid, 'delete') then 'delete' end),
       case when r.rolname = 'anon' then 'anyone' else 'signed-in users' end
from pg_class c join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated')) as r(rolname)
where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  and has_table_privilege(r.rolname, c.oid, 'insert,update,delete')
order by 1, 2;
