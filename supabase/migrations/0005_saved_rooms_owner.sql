-- Give saved designs an owner and a name.
--
-- Until now saved_rooms held only anonymous share-link rows (/room/[id]).
-- The /account page needs a per-user library of *named* designs, so:
--   * user_id links a design to the account that saved it (null for the
--     anonymous "copy share link" flow, which stays public and ownerless).
--   * name is the required label the user types when saving (null for
--     anonymous share links, which have no name).
-- The API routes read/write these with the service-role key after verifying
-- the caller's bearer token; RLS stays on with no public policies (0001).

ALTER TABLE saved_rooms
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- The account listing filters by owner and lists newest-first.
CREATE INDEX IF NOT EXISTS saved_rooms_user_id_idx
  ON saved_rooms (user_id, created_at DESC);
