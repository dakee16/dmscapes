-- Dormscape planner tables.
-- Apply with: supabase db push  (or run in the Supabase SQL editor)
--
-- Security model: all four tables have RLS enabled with NO public policies.
-- Only the API routes touch these tables, using the service-role key (which
-- bypasses RLS). Nothing here is readable or writable from the browser.

-- Waitlist signups (already exists from the landing page, kept for fresh envs)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The waitlist route treats unique-violation (23505) as "already signed up".
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_key ON waitlist (email);

-- Room submissions from users ("request my school" modal + /add-school form)
CREATE TABLE IF NOT EXISTS room_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT NOT NULL,
  dorm_name TEXT NOT NULL,
  room_type TEXT,
  length_ft DECIMAL,
  width_ft DECIMAL,
  email TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS room_submissions_status_idx ON room_submissions (status);

-- Saved room designs (share links: /room/[id])
CREATE TABLE IF NOT EXISTS saved_rooms (
  id TEXT PRIMARY KEY,
  college_id TEXT,
  dorm_id TEXT,
  room_dimensions JSONB NOT NULL,
  style TEXT NOT NULL,
  budget DECIMAL NOT NULL,
  template_id TEXT NOT NULL,
  furniture_positions JSONB NOT NULL,
  selected_products JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product click tracking (best-effort affiliate analytics)
CREATE TABLE IF NOT EXISTS product_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_price DECIMAL,
  affiliate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_clicks_created_at_idx ON product_clicks (created_at);

-- Lock everything down: service-role only (RLS on, no policies granted).
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_clicks ENABLE ROW LEVEL SECURITY;
