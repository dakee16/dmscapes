-- User profiles: one row per auth.users row, created automatically on signup.
-- Unlike the 0001 tables (service-role only), this table has RLS policies so
-- the browser client (anon key) can read/update the signed-in user's own row.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  auth_provider text,
  created_at timestamptz not null default now(),
  -- 3-20 chars; letters, digits, underscore, period only.
  constraint profiles_username_format check (
    username is null or username ~ '^[A-Za-z0-9._]{3,20}$'
  )
);

-- Case-insensitive uniqueness ("Daksh" and "daksh" are the same handle).
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create the profile row when a user signs up (any provider).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
