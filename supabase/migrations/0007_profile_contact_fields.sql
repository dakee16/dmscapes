-- Account settings adds two optional, user-editable contact fields to the
-- profile. Both nullable; the auto-create trigger in 0002 leaves them null and
-- the /account/settings page fills them in. RLS from 0002 already lets a user
-- update their own row, so no new policies are needed.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text;
