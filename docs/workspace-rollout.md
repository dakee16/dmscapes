# Room workspaces: feature-branch rollout

## Product boundaries

- `/plan` keeps the quick room, style, budget and shopping flow. Doors, windows, room shape and 2D/3D views remain available there.
- `/rooms` contains personal rooms, shared memberships and original saved designs. Importing a saved design makes a private workspace copy; it never rewrites the original.
- `/rooms/[id]` contains the furniture library, layout alternatives, placement checks, shopping assignments, comments, invitations and version history.
- Free accounts have personal workspaces. Pro hosts one active shared room with up to four people including the owner. Guests join free as editors or commenters.
- Prices and generation credits are unchanged: Plus 3, Plus recharge 3, Pro 10. Manual edits, saves, invitations and view changes use no design credits.

## Deployment prerequisites

Apply `docs/migrations/20260927_room_workspaces.sql` to the branch preview's Supabase database before testing collaboration with real accounts. Confirm the target project. No production migration runs automatically.

The migration depends on existing `auth.users`, `public.profiles` and `public.saved_rooms` tables. It creates five tables and a service-role-only transaction function. It does not modify billing, credits, catalog data or saved-room rows. Repeating the migration is safe. RLS is enabled and direct browser table access is revoked. The existing Supabase environment configuration is reused.

Without the migration or Supabase credentials, workspace APIs return an explicit 503 while original saved designs remain accessible. Do not launch publicly until the migration and two-account preview check below pass.

## Collaboration and privacy

Autosave debounces by 1.1 seconds. Foreground tabs synchronize approximately every eight seconds. This is revision-checked collaboration, not live cursors or simultaneous merging. A stale save returns 409; users can keep their edits in a private copy or load the latest shared room. Tab recovery is scoped to account and room. Opening a workspace preserves the quick planner's separate draft.

Invite tokens are random, hashed in storage, carried in URL fragments and expire in seven days. New invitations are emailed with Resend and bound to the recipient's verified email. Pending invitations reserve one of four total places (owner included). Re-sending to the same address replaces only its previous invite. Owners can cancel individual invitations. Apply the email-invitation migration in docs/email-rollout.md after the original workspace migration. Making a room personal removes guests and invites. Deleting a workspace cascades to its comments and versions but leaves original saved designs intact. If the host loses Pro, guests keep read access only.

The latest 20 versions are retained, with automatic checkpoints throttled to five minutes. Restoring preserves the previous state. Member roles and Pro hosting are enforced by database transactions using the server-verified actor.

Private workspace and login events are excluded from analytics. URL hashes are not captured and session recording is disabled.

## Verification

Run `npx tsc --noEmit`, `node scripts/check-workspaces.mjs`, `node scripts/check-workspace-api.cjs`, `node scripts/check-planner-overhaul.cjs`, `node scripts/check-credits.cjs` and `npm run build`.

The workspace SQL checks execute the actual migration in isolated PGlite PostgreSQL, never hosted Supabase. Browser fixtures test UI behavior and are not evidence of hosted integration.

Before launch, use two real preview accounts to check Free personal rooms, legacy imports, Pro sharing, joining as editor and commenter, shopping assignments, stale-save recovery, revoked/expired invites, member removal, host downgrade, history restore and mobile exports. Verify credits remain unchanged during manual work. Review and approve the branch before merging into `main`.

For an isolated local browser review, `DORMSCAPE_QA_OUTPUT=.next-workspace-review` keeps development output separate from the production build. These output directories are ignored by Git and the CSS scanner.
