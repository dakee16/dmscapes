-- Creator safety, 2026-11-04. NOT APPLIED. Review, then run once in the Supabase SQL editor
-- for project mvrogmmqglsrhoagfjvs. Safe to re-run. Needs 20261103_creators_avatars.sql first.
--
-- From a security review of the creator program:
-- 1. Approving a creator never takes over a code that already exists (one you made by hand,
--    or another creator's). If their username's code is taken, they get none; add one by hand.
--    Before this, approving someone whose username matched a hand-made code turned that code
--    back on and made it theirs.
-- 2. Approved creators can't change their username. It's their creator code and the name on
--    their gallery layouts, so renaming would let a verified creator show up as anyone.

begin;

create or replace function public.creator_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    new.reviewed_at := now();
  end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles set creator_at = coalesce(creator_at, now()) where id = new.user_id
    returning username into uname;
    if uname is not null then
      insert into public.creator_codes (code, creator, owner_id)
      values (regexp_replace(lower(uname), '[^a-z0-9_-]', '-', 'g'), '@' || new.handle || ' (' || new.platform || ')', new.user_id)
      on conflict (code) do nothing;
      -- Re-approved after a rejection: their own code comes back on.
      update public.creator_codes set active = true where owner_id = new.user_id;
    end if;
  elsif old.status = 'approved' and new.status <> 'approved' then
    update public.profiles set creator_at = null where id = new.user_id;
    update public.creator_codes set active = false where owner_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.creator_review() from public, anon, authenticated;

create or replace function public.creator_username_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.creator_at is not null and new.username is distinct from old.username then
    raise exception 'Creators keep their username: it is their creator code.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.creator_username_lock() from public, anon, authenticated;

drop trigger if exists creator_username_lock on public.profiles;
create trigger creator_username_lock before update of username on public.profiles
  for each row execute function public.creator_username_lock();

commit;
