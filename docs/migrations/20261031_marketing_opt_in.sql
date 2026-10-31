-- Marketing email opt-in, 2026-10-31. NOT APPLIED. Review, then run once in the
-- Supabase SQL editor for project mvrogmmqglsrhoagfjvs. Safe to re-run, and
-- safe if the earlier version of this file was already applied.
--
-- profiles.marketing_opt_in_at: when the user opted in; null = no marketing email.
--
-- * Accounts created before the signup checkbox went live (production deploy of
--   cac0105, 2026-10-31 23:24:43 UTC) are opted in; the Privacy Policy says so
--   and they can turn it off in Account settings.
-- * Email signups after that are opted in only if they ticked the optional box:
--   the browser sends marketing_opt_in_at in signUp's options.data (same path as
--   terms_accepted_at, 0013) and handle_new_user copies it onto the profile.
--   Google signups never see the box, so they start off.
-- * Account settings has a toggle, so the browser may update this one column on
--   its own row (RLS "profiles: update own" from 0002 limits it to the own row;
--   0011 limits the browser to the granted columns).
--
-- Mailing list: select email from public.profiles where marketing_opt_in_at is not null;

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

-- The Account settings toggle.
grant update (marketing_opt_in_at) on public.profiles to authenticated;

-- Existing accounts (created before the checkbox went live): opted in.
update public.profiles p
set marketing_opt_in_at = now()
from auth.users u
where u.id = p.id
  and p.marketing_opt_in_at is null
  and u.created_at < '2026-10-31 23:24:43+00';

-- Signups since then that ticked the box, if they arrived before this ran.
update public.profiles p
set marketing_opt_in_at = nullif(u.raw_user_meta_data ->> 'marketing_opt_in_at', '')::timestamptz
from auth.users u
where u.id = p.id
  and p.marketing_opt_in_at is null
  and u.raw_user_meta_data ? 'marketing_opt_in_at';

commit;
