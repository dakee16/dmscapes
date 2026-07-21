-- Dormscape confirmation-page feedback (rating + optional write-up).
-- Apply with: supabase db push  (or run in the Supabase SQL editor)
--
-- Schema decision: a separate table rather than nullable rating/feedback
-- columns on purchase_surveys. Feedback is submitted at a different moment
-- than the survey answer (on /thank-you, possibly never), every analytics
-- table here is an insert-only event log written by exactly one route, and
-- keeping it that way avoids an UPDATE endpoint against an RLS-locked
-- service-role table. purchase_survey_id links the two when the client still
-- has the survey row id; session_id joins the rest.
--
-- Same security model as 0001/0003: RLS enabled, NO public policies. Only
-- /api/feedback writes here, using the service-role key.

CREATE TABLE IF NOT EXISTS purchase_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Anonymous session id (localStorage), same value as purchase_surveys.
  session_id TEXT NOT NULL,
  user_id UUID,
  -- The "yes" survey row that led to the confirmation page, when known.
  purchase_survey_id UUID REFERENCES purchase_surveys (id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_feedback_created_at_idx ON purchase_feedback (created_at);
CREATE INDEX IF NOT EXISTS purchase_feedback_rating_idx ON purchase_feedback (rating);

-- Service-role only (RLS on, no policies granted).
ALTER TABLE purchase_feedback ENABLE ROW LEVEL SECURITY;
