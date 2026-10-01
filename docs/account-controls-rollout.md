# Navigation, reporting and account controls

Target: `feature/planner-overhaul`. This change does not merge or deploy main.

## One-time setup

1. Apply `docs/migrations/20260928_account_controls.sql` in the existing preview Supabase project, after the workspace migration if testing workspaces. It creates `site_reports` and a cleanup trigger; running the migration itself deletes no accounts. It is rerunnable.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on that deployment. The existing browser Supabase URL/key must reference the same project.
3. Reports persist in `site_reports`. Review the `new` queue in the Supabase Table Editor and change status to `reviewing` or `resolved` as appropriate. No reports are exposed to browser database clients.
4. Optional: configure the existing `RESEND_API_KEY`, verified `CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` to receive report notifications. The default recipient is `info@dormscape.us`. If storage fails but email is accepted, the report still succeeds. If both fail, the UI preserves the form and reports failure.
5. Redeploy the feature branch. No new paid service is required for database-backed reports.

## Account deletion contract

- The server verifies the bearer token with Supabase Auth. The account id is never accepted from the request body.
- The exact confirmation `DELETE`, explicit acknowledgement and a sign-in within 10 minutes are mandatory. A refreshed access token is not a new sign-in. Missing or stale authentication methods fail closed and lead to the existing login flow.
- The API checks that the cleanup trigger exists before calling server-only `auth.admin.deleteUser(id, false)`. Never call this API against a real customer to test it.
- The trigger removes owned workspaces (including shared rooms and their dependent data), memberships and comments, saved designs, attributed feedback/surveys/room submissions, and profile data in the same transaction as the auth deletion. A constraint or storage-ownership failure rolls back cleanup and returns an error.
- Other owners' rooms, copied layouts and version snapshots remain. Reports are kept for investigation, but their account id and matching reply email are cleared. Existing support messages, payment records, exported files and provider backups are not erased by this operation. Do not promise a universal immediate purge.
- Deletion removes paid access and unused credits, not retailer purchases. There is no subscription cancellation step: current checkout is one-time payment. Refund handling is unchanged.
- The current browser's planner draft and account-scoped workspace recovery are cleared. Other devices must clear their own local copies.
- Supabase deletes sessions and refresh tokens with the user. Already-issued JWTs can remain valid until expiry; sensitive server routes use `auth.getUser`, and profile recreation must stay constrained by the auth-user foreign key. Keep your existing RLS and foreign keys enabled.
- Dormscape does not currently store user-uploaded Storage objects. If uploads are added, implement a reviewed Storage cleanup flow; do not delete storage database rows or ignore an Auth deletion failure.

## Verification

Run `node scripts/check-account-controls.cjs`, `node scripts/check-account-cleanup.mjs`, `npx tsc --noEmit` and `npm run build`.

Optional browser fixtures: with Playwright and Chromium installed, run a local development server on port 3010 and `node scripts/check-site-controls.cjs`. It checks desktop and narrow mobile dropdowns, focus restoration, confirmation states and report failures/success using mocked responses. It refuses non-local URLs and does not delete accounts. Browser execution was unavailable in the implementation environment; run this before approving the visual changes.

Use a disposable preview account (never a customer) for the hosted smoke test: sign in, save a room, create a shared workspace, post a comment, submit a report, then confirm deletion. Check the deleted account cannot sign in, its owned data is gone, another user's rooms remain, and report identifiers are cleared. Try an old session and verify the reauthentication requirement. Confirm reports arrive in the queue/email. Browser fixtures and isolated database tests are not evidence of hosted integration.
