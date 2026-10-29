-- Public reviews from the feedback form (lib/reviews.ts, components/site/Reviews.tsx).
--
-- The feedback form now lets someone tick "Show this as a review on dormscape"
-- and give a name to show (and, optionally, their school). Nothing is shown until
-- the owner reads it and sets approved_at, e.g. in the Supabase table editor:
--   update purchase_feedback set approved_at = now() where id = '<review id>';
-- To take a review down again: set approved_at = null.
--
-- Until this is applied, /api/feedback stores the rating and words without the
-- review fields, and no reviews are shown anywhere.
--
-- Security model unchanged from 0004: RLS on, no public policies; only the
-- service role reads or writes this table.

ALTER TABLE purchase_feedback
  ADD COLUMN IF NOT EXISTS public_ok BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE purchase_feedback
  DROP CONSTRAINT IF EXISTS purchase_feedback_display_name_len,
  ADD CONSTRAINT purchase_feedback_display_name_len CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 40),
  DROP CONSTRAINT IF EXISTS purchase_feedback_school_name_len,
  ADD CONSTRAINT purchase_feedback_school_name_len CHECK (school_name IS NULL OR char_length(school_name) <= 80),
  DROP CONSTRAINT IF EXISTS purchase_feedback_public_needs_text,
  ADD CONSTRAINT purchase_feedback_public_needs_text CHECK (NOT public_ok OR (feedback_text IS NOT NULL AND display_name IS NOT NULL));

CREATE INDEX IF NOT EXISTS purchase_feedback_published_idx
  ON purchase_feedback (approved_at DESC)
  WHERE public_ok AND approved_at IS NOT NULL;
