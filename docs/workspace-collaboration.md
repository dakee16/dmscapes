# Live workspace collaboration

Shared rooms now have an online/away roster, named cursors, furniture comment pins, threaded comments and an optional audio room. The shopping panel stays alongside the plan. Hosting still requires Pro; the four-person limit includes the owner. Invited members do not need a paid plan. This change does not alter prices or design credits.

## 1. Apply the database migration

In the Supabase SQL editor for the deployment's project, run these migrations in order. Skip the first two if already applied:

1. `docs/migrations/20260927_room_workspaces.sql`
2. `docs/migrations/20260928_email_invitations.sql`
3. `docs/migrations/20260930_workspace_collaboration.sql`

The new migration is transactional and safe to rerun. It adds comment threading, realtime authorization and change notifications. It does not change existing room snapshots, catalog data, billing or credit balances. Test it in the preview project before production. Without it, live presence is unavailable and posting the new threaded comments will fail until it is applied.

In Supabase Realtime settings, disable **Allow public access**. Dormscape uses private channels only. Keep the existing Supabase URL, anon key and server service-role configuration; no new Supabase environment variables are needed. Postgres-change replication is not required: database triggers broadcast small invalidation events through `realtime.send`, and the authenticated API fetches the current state.

Each member can publish only to their own channel. Membership, the host's Pro status and a rotating room epoch authorize all subscriptions. Removing a member, changing roles or changing sharing/host access rotates the epoch. The old channel announces an access refresh and cannot be joined again. Cursors, online status and active view are transient; they are not stored as cursor history. Comments and replies are stored with the workspace.

## 2. Enable optional room voice

Create a LiveKit Cloud project, or use a reachable self-hosted LiveKit deployment, and add these server environment variables to the site deployment:

| Variable | Value |
| --- | --- |
| `LIVEKIT_URL` | The project's `wss://` WebSocket URL |
| `LIVEKIT_API_KEY` | Server API key |
| `LIVEKIT_API_SECRET` | Server API secret |

Redeploy after saving them. The Content Security Policy is generated from this configuration at build time. Never use a `NEXT_PUBLIC_` prefix for the key or secret. LiveKit service usage is billed by the selected provider/account. No provider account or paid service is provisioned by this code.

Without these variables, Room voice explains that it is not enabled. Presence, cursors and comments do not depend on LiveKit. The authenticated token endpoint verifies membership and Pro hosting, limits a room to four participants and issues two-minute join tokens with microphone-only publishing. Client identities and room names are server-controlled. Each account has one voice identity per room.

Joining to listen does not request microphone access. Joining to talk or pressing Unmute does. The browser offers mute and leave controls, speaking indicators and an explicit audio-enable action when autoplay is blocked. There is no camera, screen sharing, recording or transcription. Dormscape does not enable provider recording. The site permits microphone access only on `/rooms/*` routes.

Room deletion, member removal, role changes, leaving and making a room personal end the old voice room before the access change completes. Remaining members can rejoin. If the provider cannot close an active room, the access-change request returns an error for retry rather than reporting success. Epoch checks also reject join requests whose membership changes while the token is being created. Expired epochs never authorize joining the current room.

## 3. Verify with two real accounts

- Open a Pro-owned shared room as the owner and an invited editor. Confirm both names appear online. Hide one tab, then return; verify Away and online recover. Open another tab for the same account and confirm the roster does not duplicate it.
- Move cursors in 2D at different zoom/pan settings, then use 3D in the other browser. Cursors should point to the same floor location. Orbit the 3D camera and verify cursor and comment-pin projection. Off-floor and stale cursors disappear.
- Select furniture and choose Comment on selected. Post a note, reply from the other account and resolve it. Check the furniture pin, Open/Resolved filters, product notes and removed-item labels. A commenter can reply and resolve their own threads, but cannot resolve another person's thread or edit the room.
- Save a layout and check the second browser refreshes promptly. If both editors have unsaved changes, verify the existing conflict screen offers the latest room or a personal copy. Presence does not imply simultaneous edit merging.
- Disconnect/reconnect the network. The bar must report unavailable presence rather than implying someone is online. Comments and saves require the normal API connection; periodic refresh remains a fallback if realtime alone is unavailable.
- With LiveKit configured, join to listen in one browser and talk in the other. Check permission denial, mute, speaking indicators, audio playback, Leave, page navigation and reconnect. The microphone must stop after leaving or navigating away. No real microphone test should run without the tester's explicit action.
- While voice is active, remove a member, change their role or make the room personal. Verify old audio ends and removed members cannot rejoin. Test a nonmember and an expired invitation too. Test host downgrade and account deletion: access refresh removes the collaboration UI and disconnects the affected clients.
- Check four-person capacity, a phone-sized browser, keyboard focus in comments/voice, long names and long comments.

## Local verification

Run:

```sh
npx tsc --noEmit --incremental false
node scripts/check-workspace-collaboration.mjs
node scripts/check-workspace-voice.cjs
node scripts/check-workspace-api.cjs
node scripts/check-workspaces.mjs
npm run build
```

SQL tests run the real migration and RLS rules in isolated PGlite. Voice tests use a mocked provider transport and verify actual signed token grants. Local UI fixtures do not prove hosted Supabase delivery, actual microphone permission or LiveKit audio routing. Complete the two-account checks against the configured preview before release.
