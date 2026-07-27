-- Dormscape Contact Us submissions (/contact page).
-- Apply with: supabase db push  (or run in the Supabase SQL editor)
--
-- Durable record of every message sent through the contact form, kept
-- independently of whether the transactional email (Resend) actually delivered
--, so nothing is lost if email is unconfigured or the provider hiccups.
--
-- Same security model as the other tables (0001/0003/0004): RLS enabled, NO
-- public policies. Only /api/contact writes here, using the service-role key.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The sender's own email (required) so we can reply.
  from_email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  -- Whether the notification email was accepted by the provider (best-effort).
  emailed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx ON contact_submissions (created_at);

-- Service-role only (RLS on, no policies granted).
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
