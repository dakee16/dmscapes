-- Marketing email opt-in, 2026-10-31. NOT APPLIED. Review, then run once in the
-- Supabase SQL editor for project mvrogmmqglsrhoagfjvs.
--
-- Email signup shows an optional, unticked box ("Email me dorm planning tips and
-- dormscape updates"). When ticked, the browser sends the time in signUp's
-- options.data as marketing_opt_in_at, same path as terms_accepted_at (0013).
-- handle_new_user copies it onto the profile. Null = not opted in. Google
-- signups never see the box, so they stay null (opt-in must be explicit).
--
-- No client grant: 0011 limits browser UPDATEs to username/full_name/phone and
-- the security hardening limits INSERTs to id/email/auth_provider, so only this
-- SECURITY DEFINER trigger (or the service role) writes the column.
--
-- Mailing list: select email from public.profiles where marketing_opt_in_at is not null;
-- Unsubscribe:  update public.profiles set marketing_opt_in_at = null where email = '...';

begin;

alter table public.profiles
  add column if not exists marketing_opt_in_at timestamptz;

-- Same as 0013, plus marketing_opt_in_at.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
begin
  insert into public.profiles (id, email, auth_provider, terms_accepted_at, marketing_opt_in_at)
  values (
    new.id,
    new.email,
    provider,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
      case when provider <> 'email' then now() else null end
    ),
    nullif(new.raw_user_meta_data ->> 'marketing_opt_in_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Keep it off the API (security hardening 2026-10-04).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill anyone who signed up with the box ticked before this ran.
update public.profiles p
set marketing_opt_in_at = nullif(u.raw_user_meta_data ->> 'marketing_opt_in_at', '')::timestamptz
from auth.users u
where u.id = p.id
  and p.marketing_opt_in_at is null
  and u.raw_user_meta_data ? 'marketing_opt_in_at';

commit;
