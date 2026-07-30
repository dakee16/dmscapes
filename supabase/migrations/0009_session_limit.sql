-- Concurrent-session cap. Reduces casual account/password sharing (Plus in
-- particular) by keeping at most N active auth sessions per user. Supabase Auth
-- allows unlimited concurrent sessions by default; this adds a ceiling.
--
-- How it works: after any new sign-in, the app calls enforce_session_limit()
-- (server-side, service role) which keeps the N most recent sessions for the
-- user and deletes the rest, oldest first. Deleting an auth.sessions row makes
-- GoTrue cascade-remove that session's refresh tokens, so the bumped device can
-- no longer refresh and is signed out at its next token refresh (within the
-- access-token lifetime, ~1 hour by default). The current access token stays
-- valid until it expires; this is a sharing deterrent, not an instant kill.
--
-- The limit applies to ALL accounts for consistency; the motivation is Plus.
--
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

create or replace function public.enforce_session_limit(
  p_user_id uuid,
  p_keep integer default 2
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  -- Guard against bad input; never touch sessions when p_keep < 1.
  if p_user_id is null or p_keep is null or p_keep < 1 then
    return 0;
  end if;

  with ranked as (
    select
      id,
      row_number() over (
        -- Newest first, so the freshly created session is always kept and the
        -- oldest sessions fall past the keep window.
        order by created_at desc, id desc
      ) as rn
    from auth.sessions
    where user_id = p_user_id
  ),
  removed as (
    delete from auth.sessions s
    using ranked r
    where s.id = r.id
      and r.rn > p_keep
    returning s.id
  )
  select count(*) into v_deleted from removed;

  return coalesce(v_deleted, 0);
end;
$$;

-- The server calls this with the service_role key (which bypasses RLS); grant
-- execute explicitly for clarity and never expose it to anon/authenticated.
revoke all on function public.enforce_session_limit(uuid, integer) from public;
grant execute on function public.enforce_session_limit(uuid, integer) to service_role;
