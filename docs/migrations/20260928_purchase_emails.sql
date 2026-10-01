-- Durable deduplication for invoice emails, independent of credit fulfillment.
begin;
create table if not exists public.purchase_email_deliveries (
  invoice_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.purchase_email_deliveries enable row level security;
revoke all on public.purchase_email_deliveries from public,anon,authenticated;
grant all on public.purchase_email_deliveries to service_role;
comment on table public.purchase_email_deliveries is 'Server-only invoice mail outbox. Payload freezes retry contents; sent_at means accepted by the email provider, not inbox delivery.';
commit;
