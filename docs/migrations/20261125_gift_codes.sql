-- Gift a plan, 2026-11-25. NOT APPLIED. Review, then run once in the Supabase SQL editor
-- (project mvrogmmqglsrhoagfjvs). Safe to re-run. Apply it BEFORE merging the gift-a-plan branch:
-- until this table exists, checkout refuses gift purchases ("Gifts aren't available yet"), so no
-- one can pay for a gift that can't be made.
--
-- One row per paid gift checkout (app/api/stripe/webhook makes it, lib/gift-codes.ts):
--   code_hash      sha256 of the 16-character code. The code itself is never stored: the webhook
--                  derives it from the Stripe session and a server secret, emails it to the recipient,
--                  and redemption looks it up by hash.
--   code_hint      the code's last 4 characters, to find a gift when someone writes in.
--   emailed_at     when Resend accepted the gift email (null = not sent yet; Stripe retries the event).
--   redeemed_by/at who redeemed it, once (app/api/gift/redeem).
--   voided_at      a refund or chargeback took it back; a won chargeback clears it again.
-- No expiry, by owner decision.
--
-- Look up a gift by its recipient, or by the code's last 4 characters:
--   select id, plan, recipient_email, code_hint, created_at, emailed_at, redeemed_at, voided_at
--   from public.gift_codes where recipient_email = 'friend@example.com' or code_hint = 'PQRS';
-- Gifts whose email hasn't gone out (Stripe keeps retrying them; check RESEND_API_KEY):
--   select id, stripe_session_id, created_at from public.gift_codes where emailed_at is null and voided_at is null;

begin;

create table if not exists public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint text not null check (code_hint ~ '^[0-9A-HJKMNP-TV-Z]{4}$'),
  plan text not null check (plan in ('plus', 'pro')),
  credits integer not null check (credits between 1 and 100),
  -- A deleted account keeps its gifts working: the buyer's or redeemer's link is cleared, not the gift.
  buyer_id uuid references auth.users (id) on delete set null,
  recipient_email text not null check (char_length(recipient_email) between 3 and 254 and position('@' in recipient_email) > 1),
  message text check (message is null or char_length(message) between 1 and 300),
  sender_name text check (sender_name is null or char_length(sender_name) between 1 and 60),
  stripe_session_id text not null unique,
  payment_intent text,
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  voided_at timestamptz
);

-- Refunds and chargebacks find the gift by its payment.
create unique index if not exists gift_codes_payment_intent_idx on public.gift_codes (payment_intent) where payment_intent is not null;
-- A refund elsewhere checks the plans someone still holds through gifts they redeemed.
create index if not exists gift_codes_redeemed_by_idx on public.gift_codes (redeemed_by) where redeemed_by is not null;
create index if not exists gift_codes_buyer_idx on public.gift_codes (buyer_id) where buyer_id is not null;

-- Server only, like creator_codes: RLS on with no policies, and no browser grants at all. The billing
-- page reads a buyer's gifts through the server (app/api/account/invoices).
alter table public.gift_codes enable row level security;
revoke all on public.gift_codes from public, anon, authenticated;
grant select, insert, update, delete on public.gift_codes to service_role;

commit;
