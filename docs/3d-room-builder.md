# 3D Room Builder

Entry: `/plan/draw/3d`. The public landing and FAQ are indexable. Opening the editor and completing its handoff both verify Pro on the server through `/api/room-builder` using the existing Supabase bearer-token flow.

## Flow and data

1. A Pro member places a rectangular floor, chooses a starter shape, or traces a closed perimeter on a 60 by 60 ft grid.
2. The editor supports corner moves, exact coordinates, wall splitting, doors, windows, opening offsets and widths, four door swings, built-in closet placement/movement/sizing/footprint rotation, ceiling height, floor finish, wall color, occupancy, and mattress size.
3. The validated room is normalized into the existing `SelectedRoom` shape. Style and budget use the existing flow. `plannerView` is set to `3d` so the result opens in 3D.

Closets use the existing `RoomOutline.closets` fixed-obstacle representation in feet. Each width/depth is 0.5 to 20 ft. Footprints must remain inside the polygon and cannot overlap each other. The handoff normalizes their X/Z positions with the room origin. Legacy version-one drafts without a `closets` field restore with an empty list.

The unfinished draft is local to the browser, keyed by user ID. The existing planner's Save design action remains the cloud-save path after furnishing. The builder API does not save a design or spend a generation credit.

Supported geometry is one connected, single-level room with a non-crossing outline, at most 40 corners, 20 openings, and 20 closets. Internal partition walls, separate rooms, floor holes, and multiple floors are outside this version. The minimum completed room has a 4 ft bounding width and length and 16 sq ft of area.

## Implementation

- `lib/room-builder.ts`: draft parsing, geometry validation, opening/closet edits, and planner handoff.
- `components/builder/`: access entry, editor controls, local history and draft recovery.
- `public/experience/room-builder.js`: local Three.js construction renderer. Draws on demand, with explicit geometry/material cleanup and a single floor surface.
- `app/api/room-builder/route.ts`: Pro verification and canonical room validation; no client entitlement is trusted.
- `content/builder-faq.ts`: shared visible FAQ and structured-data content.

## Checks

Run `node scripts/check-room-builder.cjs` for geometry, rejected edits, persistence/handoff, mocked tier authorization, and real Three.js mesh/raycast checks. Existing regressions are `check-studio.cjs`, `check-canvas-labels.cjs`, and `check-studio-surfaces.mjs` in `scripts/`. Run `npm run build` for production and TypeScript validation.

Before release, exercise the feature with a real Pro account in desktop and mobile browsers: place a floor, trace an L-shape, edit a corner, add and drag openings and closets, resize a closet, undo through floor creation, recover a draft after refresh, and complete styling into the 3D planner. Check mouse orbit, touch pinch, top view, and WebGL recovery. These GPU/browser checks could not run in the development environment because its browser blocked the local preview URL. Automated authorization tests mock the account provider and do not purchase or alter a live account.
