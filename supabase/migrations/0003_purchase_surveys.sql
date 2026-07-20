-- Dormscape post-purchase confirmation survey.
-- Apply with: supabase db push  (or run in the Supabase SQL editor)
--
-- Same security model as 0001: RLS enabled, NO public policies. Only the
-- /api/purchase-surveys route writes here, using the service-role key.
--
-- Captured when a user returns to the Dormscape tab after their first buy
-- click of the session and answers the "did you grab everything?" prompt.
-- Important analytics asset: measures how often planning turns into purchase.

CREATE TABLE IF NOT EXISTS purchase_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Anonymous session id (localStorage), or the user id if signed in.
  session_id TEXT NOT NULL,
  user_id UUID,
  -- 'yes' | 'still_deciding' | 'no'
  response TEXT NOT NULL,
  -- Link to a saved design when one exists this session; otherwise null and
  -- the design lives in room_snapshot instead.
  saved_room_id TEXT REFERENCES saved_rooms (id) ON DELETE SET NULL,
  -- The session's design at prompt time: { college_id, dorm_id, style, budget,
  -- room_dimensions }. Kept so a survey is analyzable even without a saved row.
  room_snapshot JSONB,
  -- Cart total (sum of the product list) shown when the prompt appeared.
  cart_total DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_surveys_created_at_idx ON purchase_surveys (created_at);
CREATE INDEX IF NOT EXISTS purchase_surveys_response_idx ON purchase_surveys (response);

-- Service-role only (RLS on, no policies granted).
ALTER TABLE purchase_surveys ENABLE ROW LEVEL SECURITY;
