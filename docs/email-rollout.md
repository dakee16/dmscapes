# Email invitations, invoices, and the homepage refresh

All changes are on `feature/planner-overhaul`. No production database or email dashboard has been changed by this commit.

## 1. Apply database migrations

In the Supabase SQL editor for the environment being deployed, apply in this order:

1. `docs/migrations/20260927_room_workspaces.sql` if workspace tables do not exist yet.
2. `docs/migrations/20260928_email_invitations.sql`.
3. `docs/migrations/20260928_purchase_emails.sql`.

The two new migrations are safe to re-run. The invitation migration replaces the original workspace function; do not reapply the older migration afterwards.

Old anonymous workspace invitation links are invalidated. Send new email invitations. Existing members and room data are preserved. If a room already has more than four people, no one is silently removed, but new invitations/joins are blocked until the owner brings membership below the limit. The owner counts toward four; pending invitations reserve remaining places for seven days.

## 2. Configure Resend

Set server-only `RESEND_API_KEY` and `CONTACT_FROM_EMAIL="Dormscape <contact@dormscape.us>"` in the deployment environment. Verify the sending domain in Resend. Set `NEXT_PUBLIC_SITE_URL` to that environment's real origin so invitation buttons return to the correct app. Use separate preview credentials and your own test recipients when testing.

Invitation emails are sent by the app, not Supabase Auth's Invite user template. They contain the host name, room name, access level, and a join button. They only work for the verified address invited. Recipient addresses appear in the owner's pending invitations, never another member's response. Failed sends return an error and cancel that invitation attempt; resending replaces only that address's prior invitation.

Disable link/open tracking for authentication and invitation emails. Do not rewrite the join URL: its token is carried after `#` so it does not appear in normal request logs.

## 3. Stripe purchase email setup

Add **invoice.paid** to the existing `/api/stripe/webhook` endpoint alongside **checkout.session.completed** and **checkout.session.async_payment_succeeded**. Keep the endpoint's existing signing secret.

New one-time Checkout sessions request a paid invoice. Once Stripe reports it paid, Dormscape sends a branded thank-you email naming the exact purchase, actual paid amount (including discounts), invoice number, date, and credit allowance. The Stripe PDF is attached, with a hosted invoice button as well. Credits still use the existing checkout fulfillment path. An email retry cannot re-grant credits. Previous checkouts are not retrospectively emailed.

Set your accurate business details and branding in Stripe; Stripe uses them on the PDF. Post-payment invoices have a separate Stripe fee (currently 0.4%, capped at USD 2 per invoice; confirm your account pricing). This does not change Dormscape's customer-facing prices.

The `purchase_email_deliveries` table stores a frozen payload and an accepted timestamp. Duplicate invoice events skip accepted mail; concurrent/retried sends use the same Resend idempotency key. Stripe receives a 503 for a delivery failure so it retries. Resend's key lasts 24 hours: if Resend accepted an email but the subsequent database write failed for more than 24 hours, check Resend's logs before manually replaying the event to avoid another email. `sent_at` means provider acceptance, not inbox delivery. Check bounce/delivery events in Resend.

Enable Stripe's own successful-payment emails if you also want its standard receipt; that is a separate message from Dormscape's thank-you email. Invoice emails contain billing data and are server-only. Keep the table under your payment-record retention rules.

## 4. Paste the Supabase templates

See `docs/email-templates/README.md` for subjects and paste-ready HTML for signup confirmation, password reset, and email change. These templates preserve `{{ .ConfirmationURL }}`; do not replace it with a static homepage link.

## 5. Verify in preview

- Use a Pro owner plus three separate test recipients. Check editor/commenter access, forwarded-link rejection, email verification, cancel, resend, expiry, and a fifth-person rejection.
- Check invitations to existing members, malformed addresses, and mail-provider failures. No success message should appear after failure.
- Use Stripe test mode to purchase Plus and Pro and a recharge. Confirm the invoice email and PDF, correct discounted amounts, and account credits. Replay the invoice event and check that no second email is sent.
- Complete a real test signup/reset/email-change with each installed Supabase template. Verify mobile and desktop mail clients and the actual redirect.
- Run `node scripts/check-workspaces.mjs`, `node scripts/check-workspace-api.cjs`, `node scripts/check-transactional-emails.cjs`, and `npm run build -- --webpack`.

## References

- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Stripe paid invoices and invoice.paid](https://docs.stripe.com/receipts)
- [Stripe post-payment invoice pricing](https://support.stripe.com/questions/pricing-for-post-payment-invoices-for-one-time-purchases-via-checkout-and-payment-links)
- [Resend attachments](https://resend.com/docs/api-reference/emails/send-email)
- [Resend idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)
