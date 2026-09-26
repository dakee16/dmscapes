# Planner overhaul

Development branch: `feature/planner-overhaul`, based on main at `846c70e479fe2bfa3b364ac7f424c35ed33ae6d9`. This branch is intended for review before merging.

## The eight workstreams

| Area | Implemented behavior |
| --- | --- |
| Faster start | Find a school, enter dimensions, draw a room, or open a sample. Enter the manual workspace before choosing a vibe. Empty rooms are valid drafts and saves. |
| One workspace | Editable room name, save status, a left tool dock, central 2D/3D view, and a shared task panel. Furnish opens first; the last panel is remembered. Narrow screens use one task sheet. |
| Independent furniture | 21 generic pieces with editable dimensions, duplication, rotation, locking, hiding, removal, fixed fixtures, and school/owned/buy status. These pieces are separate from the shopping cart. |
| Bed configurations | Standard, raised, lofted, and bunked geometry, sleeping capacity, under-bed clearance, mattress headroom, and school-permission prompts. The selected bedding size survives saving and reopening. |
| Placement checks | Footprints, walls, openings, overlaps, closet access, working space, window proximity, bed capacity, and routes from the first door. Checks can highlight a piece or region. Suggested moves are previewed before application. |
| Roommate planning | Names, colors, ownership, purchasing assignments, per-person and shared estimates, duplicate-appliance notices, and saved room review pages with alternatives and comments. |
| Layout ideas | Seven arrangement intents, side-by-side metrics, apply/cancel, and up to three kept alternatives. Existing inventory and current ownership are retained; fixed and locked furniture families are protected. |
| Shopping and recovery | Product swap footprint previews, dimension-confidence messages, owned/provided items excluded from purchase totals, shared assignment updates, durable device recovery, and distinct local/account-save indicators. |

## Existing access and credits

Manual 2D arrangement and layout previews do not spend credits. Product-match generation continues through the existing authenticated credit endpoint. The offers remain 3 initial Plus credits, 3 recharge credits, and 10 initial Pro credits. Nothing changes payment amounts, Stripe grants, or purchased balances.

2D drawing and room-shape editing retain the Plus/Pro gate. The 3D builder, interactive 3D room, and custom vibes retain the Pro gate. Existing export and account-comparison gates remain. Importing an Amazon item remains paid; adding a generic room footprint is part of manual planning.

## Storage and shared review setup

Existing `saved_rooms` JSON stores the added furniture fields, optional mattress size, and `editor.planning`. Legacy rooms still open with defaults. Every saved link is a snapshot. Opening a copy does not update the shared original.

The last complete device draft is mirrored to `dormscape-planner-recovery-v2`. The current tab wins when both versions exist. Starting an incomplete school selection does not erase the previous usable draft; explicit planner reset clears it. Storage failures show an honest tab-only or unavailable status. Device drafts are not cloud backups and are shared by users of the same browser. The privacy policy, terms, and design disclaimer describe this behavior.

Apply `docs/migrations/20260925_room_reviews.sql` to the **branch's preview Supabase environment** to enable comments. This migration has not been applied to production by this change. The new table has row-level security enabled; anonymous and authenticated direct table access is revoked. The API uses the existing server service client, validates the saved room and alternative, derives identity from the bearer token, rate-limits requests, and omits account IDs from public responses. Anyone with a room link can read comments; posting requires sign-in. The latest 100 comments are returned in chronological order. If the service/table is unavailable, the room still renders and an actionable error preserves the comment draft.

No new packages or external rendering services are required.

## Verification

Run from the repository root:

```sh
node scripts/check-planner-overhaul.cjs
node scripts/check-credits.cjs
node scripts/check-studio.cjs
node scripts/check-room-builder.cjs
node scripts/check-canvas-labels.cjs
node scripts/check-studio-surfaces.mjs
npx tsc --noEmit
npm run build
```

The new integration checks exercise actual store actions and save/review handlers with mocked service boundaries: independent inventory, duplication, mattress sizing, bed modes, matching 2D/3D clearance rules, footprint union, concave floor areas, blocked entrances, immutable arrangement previews, locked attachment families, ownership totals, validation, closed-tab recovery, empty-room saves, and comment authorization. Existing credit regressions cover failed generation and concurrent spending; no live purchases are used. Three.js mesh checks exercise lofts, bunks, new furniture kinds, and separated horizontal surfaces without WebGL.

## Review limits

The development browser blocked the local preview URL, so live desktop/mobile visual interaction and GPU rendering were not verified in this environment. Before merging, review the branch deployment at desktop and phone widths, with a guest and a real Pro account. Check furniture dragging, mobile panel focus, bed-mode geometry, undo/redo, save/reopen, product swapping, and review comments after applying the preview migration.

Clearance, routes, and floor area are planning estimates, not housing approval or accessibility certification. Floor area uses a 3-inch sample grid and counts overlapping footprints once. Routes use the first recorded door and the selected width. Closet access assumes the recorded front direction. Generic dimensions must be measured against the actual room and furniture. Layout previews can retain unresolved warnings and do not silently authorize lofting. Any school-required loft equipment is outside the cost estimate.

Roommate review is asynchronous feedback on saved snapshots. Live simultaneous editing is outside this branch.
