# Redesign handoff (for Claude Code)

The whole front end is redesigned on the `redesign` branch. What's left needs real keys: end-to-end testing against Supabase, Stripe, LiveKit, Resend and PostHog, and a few follow-ups that need data or schema changes. Read `KIT.md` before changing any UI.

## What's on the branch

| Area | Main files |
|---|---|
| Foundation: fonts, tokens, motion, nav (More menu), footer, dialog base, loader, cookie banner | `app/ds.css`, `app/ds-dialog.css`, `app/layout.tsx`, `components/ds/*`, `components/Nav.tsx`, `components/Footer.tsx`, `components/site/{Modal,BrandLoader,CookieConsent,FeedbackLink,HeaderCredits}.tsx` |
| Homepage | `app/page.tsx`, `components/home/*`, `lib/home-data.ts` |
| Colleges, college, hall | `app/colleges/**`, `components/{colleges,college,hall}/*`, `lib/room-preview.ts`, `lib/school-names.ts` |
| Pricing, about, methodology, contact, add school, FAQ, blog, legal, 404, report, thank-you | `app/*`, matching `components/<page>/` folders |
| Login, profile menu, feedback | `app/login`, `components/auth/*`, `components/products/FeedbackForm.tsx` |
| Planner steps (School → Room → Vibe → **Budget** → planning screen) | `app/plan/{page,style,budget,create-vibe}`, `app/plan/layout.tsx`, `components/plan-steps/*`, `components/planner/*` |
| Studio: result screen, 2D Konva canvas, list, swap, 3D studio panels | `components/planner/PlanResult.tsx`, `components/studio/*`, `components/canvas/*`, `components/products/*`, `components/studio-ui/*` |
| Draw in 2D, 3D Room Builder | `app/plan/draw/**`, `components/planner/RoomDrawCanvas.tsx`, `components/draw/*`, `components/builder/*`, colours in `public/experience/room-builder.js` |
| My Room (Pro), My designs, join, share page | `app/my-room` (new), `app/rooms/**`, `app/room/[id]`, `components/{my-room,workspace,room}/*`, `components/studio/{WorkspacePanels,SharedRoomStudio,RoomReview}.tsx` |
| Account, billing, settings, compare, deleted, reset password, upgrade and welcome dialogs | `app/account/**`, `app/reset-password`, `components/{account,account-ui}/*`, `components/site/{UpgradeModal,PlusWelcome,SignupWelcome,PurchaseThankYou,BuyCreditsForm}.tsx`, `components/auth/UsernamePrompt.tsx` |

Every page keeps its URL, metadata, canonical, OG image and JSON-LD. Legal text is unchanged word for word. `app/experience.css` is down to the skip link, progress line and motion toggle; 38 unused components, the five old fonts and the old homepage assets are gone.

## Behaviour changes to know about (all approved or flagged to the owner)

- **New `/plan/budget` step** between vibe and generation; guards send you back if room or vibe is missing. New PostHog event `budget_step_viewed {style}`; every existing event kept.
- **Planning screen**: no percentage; a ~1.4 s preset (walls, built-ins, picks) with "Open my plan" to skip, then the result as soon as generation finishes. The old forced 2.4 s wait on create-vibe is gone. The vibe step passes typed Pro text to `/plan/create-vibe?vibe=`.
- **Upgrade sheet starts checkout directly** (Plus and Pro cards, same `buy()` call; `upgrade_cta_clicked` also fires with `type`). "Compare every plan" still links to /pricing. Easy to revert if the owner prefers.
- **Billing**: Plus members get a "Recharge · 3 credits for $2.99" button (existing `startCheckout("recharge")`).
- **Compare** reads `?a=<id>&b=<id>` (the My designs pick-two tray links there); falls back to the two newest designs.
- **/my-room**: Pro with a shared room → redirected into it; Pro without → three-step Setup (pick a design, draw the line, invite) using the existing workspace create/save/share/invite API; Free/Plus → Pro gate (`openUpgrade("workspace")`). /rooms is now "My designs".
- **Invites** stay email-only; the UI shows "Resend invite" (the token never reaches the client).
- **Cookie banner** is in the server HTML and shown by a tiny inline script, so it doesn't become the phone LCP element.
- **Comments** open as a side panel on desktop and a bottom sheet on phones (non-modal).
- **Terms**: "Shared room workspaces" is now numbered (10), so the last two sections are 11 and 12. Text unchanged.
- **Site header is the ruler card** (`components/Nav.tsx`, `components/ds/SiteNav.module.css`): a floating plate inside the sticky header (88px; 72px on phones, so `--ds-nav-h` is now 72px under 768). The plate takes the colour of the section just below the header (`document.elementsFromPoint` at x=8, skipping fixed/sticky chrome, in one rAF-throttled scroll listener plus resize and route change) and switches to the dark tone on a dark ground; `navTone="dark"` still forces it. A ruler runs along its bottom edge with a tape strip for scroll progress, which replaces `.dm-progress` wherever the site nav is (blog posts hide both for their reading bar). The current page gets a red marker on the ruler. Signed in below 1360px, the account controls go compact (count chip, avatar, "Plan free"; the credits word stays for screen readers) so they fit beside the links; a long @username truncates. Account trigger styles are scoped to `.ds-site-nav`, so the planner header keeps its pill. Checked signed out and as Free, Plus and Pro from 1600 down to 360 with no overflow and no sideways scroll.

## 2D planner: Room view (October 2026)

The 2D plan opens in **Room view**, an illustrated top-down room; **Plan view** is the flat drawing it had before, grid on. The switch is in the canvas tool rail and its More menu, saved in `localStorage["dormscape-canvas-view"]`. Exports (PNG) use whichever view is on and still drop `editor-only` nodes; the list PDF has no plan image. Drawing only: geometry, hit areas, drag, rotate, snap, keyboard, pins, owner and lock outlines, ghosts and dimensions behave as before.

- **Themes**: `room` on each style in `lib/styles.ts` (floor, floorAlt, wood, woodDark, textile, textileAlt, accent, glow, rug pattern). Custom and retired styles derive one from their palette (`roomThemeFromPalette`); look one up with `roomTheme(styleId)`.
- **Shell** (`components/canvas/RoomCanvas.tsx`): planks from one offscreen tile per vibe and zoom bucket (`floorTile`), clipped to the room (rectangles and hand-drawn outlines); walls drawn outside the floor, so the fit leaves up to 16px more margin and the dimension lines move out by the wall; window glass and daylight; door threshold, leaf and swing; hatched closets. The static floor is one cached bitmap (up to ~8 MP).
- **Pieces** (`RoomGlyph` in `components/canvas/FurnitureGlyph.tsx`): drawn inside the real footprint, cached per piece with the drop shadow baked in; re-cached only when size, vibe, dressed state, detail level or zoom bucket changes. Under ~28px on screen the detail drops. Bed heads follow the plan's throw pillows (else the end by a wall); chairs face their desk; dressers and appliances open away from the nearest wall. No props are invented: book spines only for a bookshelf from the cart.
- **Dorm-provided** pieces: plain maple or laminate plus a folded corner tag (not colour alone); the size pill says "Dorm-provided" when it fits.
- **List numbers** (both views): off by default, because a number on every piece crowded the plan. The piece in focus (selected, or its list row hovered or tapped) still shows its number; More → List numbers (or N) shows them all, saved in `localStorage["dormscape-canvas-numbers"]`. On phones the "Everything fits" pill hides while all is well (it covered the room's top dimension); warnings and drag positions still show.
- **Readability**: overlap, selection and hover outlines get a white halo; plan labels get a backing pill; on dark floors (gamer, academia) the door swing and leaf turn light.
- Checked in all nine vibes plus custom, both views, hand-drawn L-room, bunk, owner outlines, selection and rotation, overlap, phone, PNG export.
- Drag performance (production build, dragging a piece): with GPU canvas, the normal case on laptops and phones, both views hold ~9–10 ms a frame at 4× (desktop) and 6× (phone) CPU throttle. A browser painting canvas in software (no GPU) does more pixel work in Room view: about 40 ms vs 12 ms a frame on a full desktop canvas, 14 vs 10 ms on a phone. If that matters, the next step is drawing the still pieces and floor into one bitmap while a piece is dragged.

## Pro 3D studio: look and light (October 2026)

Spec: `design-handoff/3d-studio/` (`scene.js` values, `renders/3d-hero.jpg`). Files: `public/experience/studio-scene.js` (renderer, room shell, light), `studio-models.js` (pieces), r170 add-ons in `public/experience/vendor/addons/` (imports point at the vendored build; license in `vendor/LICENSE-three.txt`).

- **Renderer**: Neutral tone mapping, RoomEnvironment through PMREM, hemisphere fill, one VSM sun (radius 7) aimed through the plan's first window (else the preset's azimuth), a fill light just inside that window, and a shadow-catcher ground on the paper background. GTAO runs through EffectComposer with the `scene.js` values. If WebGL2 float targets or the composer fail, it renders straight to the canvas without AO; with no WebGL2 at all, the existing "3D is unavailable" message shows.
- **Performance**: still renders on demand. While the camera or a piece moves, frames skip AO; one full-quality frame draws ~150 ms after it settles. Shadows re-render only when the room or a piece changes (at most every 120 ms during a drag). Phones and low-power devices (coarse pointer on a small screen, ≤4 cores or ≤4 GB) get pixel ratio ≤1.5, a 2048 shadow map and half-resolution AO. Drag frame times matched the old renderer (desktop ~10 ms, 4× throttled phone ~10.5 ms).
- **Room shell**: 0.42 ft walls sit outside the floor (pieces never clip), on a plinth, with a darker cap, dark baseboards, framed windows (mullions, sill, tinted glass) and doors (casing, leaf, knobs). Cut-away and opening editing are unchanged.
- **Light presets** (`lighting`): `day`, `evening` (stored name; shown as "Golden hour"), and `night`. Night is lit only by lamps, string lights, LED strips and candles in the plan (up to 6 point lights), else a dim room light; the window glass goes dark blue.
- **Vibe dressing** (`studio.dressVibe`, missing means on): bedding, rug, throw, pillows, curtains and decor take the vibe's `room` theme; off uses each product's colour. Dorm-provided furniture stays plain wood. Nothing is drawn that isn't in the plan (no books, laptops or pillows on bare beds).
- **Floors**: oak, walnut, concrete (labelled "Tile": speckled vinyl tiles) and carpet; textures are drawn once per floor change.
- **Controls** (`PlannerStudio.tsx`):
  - **Over the room:**
    - Vibe chip and Open 2D plan at top-left.
    - Snapshot and Full screen at top-right. Snapshot downloads a 2x PNG with no ring, card or controls, keeps the export watermark and fires `studio_snapshot`. Full screen uses the browser's full screen where offered, on top of the expanded studio.
    - Light switch (Day / Golden hour / Night, stacked) at bottom-left; it moves up beside the camera pill on narrow desktops.
    - The dark camera pill at bottom-center: Dollhouse / Top / Walk in, plus zoom.
  - **Selection:** a dashed cobalt ring on the floor, drawn in the scene, plus a card the scene keeps above the piece (`RoomScene` `anchor`). The card shows the name, Dorm-provided / In your list / Not in your list, and Rotate, Swap and Remove (list remove). While dragging, the old position label shows instead.
  - **Room tab** (`StyleDetails`):
    - Light, Floor and Walls.
    - The "Dress the room in my vibe" checkbox (`dressVibe`).
    - The finish note, unchanged.
    - `LightSwitch` and `FloorSwatches` are shared components.
  - **Walk in** (`WalkIn.tsx`, used by the planner and My Room studios):
    - **View:** eye level 5.3 ft, fov 52, with the wall colour (dimmed by the light preset) as the ceiling. It starts at the most open spot (nearest the door on a tie), facing the window.
    - **Moving:** arrows and WASD work only while the canvas has focus (listeners on the canvas, released on blur). ↑/↓ or W/S walk, ←/→ turn, A/D step sideways. Drag looks around.
    - **Collisions:** you stay 0.7 ft inside the walls, out of closets, and out of anything taller than a rug that sits below head height. You slide along obstacles instead of stopping.
    - **Overlays:** Back to dollhouse (top-left) and a mini-map (top-right) showing the outline, door, window, piece blocks and a dot with a view cone, which the scene moves directly. On fine pointers, the hint "Walk with the arrow keys · drag to look around" sits at bottom-left; on touch screens, a hold-to-move pad sits at bottom-right. The camera pill hides while walking.
    - **Sync:** the scene reports camera-mode changes (`onCamera`), so Focus on a piece leaves Walk in cleanly. Resizing no longer resets your walk position.
  - **Phones (≤780 px, the studio's existing breakpoint):** the room on top with the camera pill, then a sheet with the selected piece (Rotate, Swap), the light switch, floor swatches and the budget bar with List. Arrange / Room / List still open the full panel. My Room's camera buttons use the same Dollhouse / Top / Walk in names.

## Test end to end with real keys

Supabase auth (Google, email, sign-up consent, reset, `next=`), Stripe (Plus and Pro from /pricing and from the upgrade sheet, recharge, Flex), saving and generation through the new budget step, workspace create/share/invite/join/comments/versions/restore, LiveKit room call, Resend emails, PostHog funnel incl. `budget_step_viewed`, Amazon tag on every product link. None of these could run in the redesign sandbox (no env), so screens were checked with mocked APIs and test-time patches only.

Local browser QA: open the dev server on `localhost`, not `127.0.0.1`. Next blocks its dev resources for other hosts, so on `127.0.0.1` pages never hydrate (the `scripts/check-*.cjs` defaults point there; pass their URL env var). Signed-in states can be faked in dev with `sessionStorage["dormscape-dev-auth"]` (see `lib/auth-context.tsx`).

## Follow-ups that need data or schema changes

1. **Version author and summary** (approved decision): `workspace_versions` has neither. Proposed migration `docs/migrations/20261003_workspace_version_authors.sql` (NOT applied; show the owner first). It also needs the one-line RPC change and GET route change described in its comments.
2. **Item status Not yet / Ordered / Packed** (approved decision): `sanitizePlanning` in `lib/studio-save.ts` keeps only `supply` and `assignedTo` from `productSupply`, so a status would be dropped. Add an optional status there, then the Who brings what board can show it.
3. **Shared pieces hatched yellow on the plan, the split line, and an owner filter** on the canvas: needs `components/canvas/RoomCanvas.tsx` changes (shared pieces currently get a grey outline).
4. **Invite preview**: /rooms/join can't show the inviter, room or "your half" before joining without a small preview API.
5. **Door and window positions, closet positions** for school rooms aren't in the data, so plans place them from the template.
6. **Recharge confirmation**: Stripe's recharge success URL `/account?recharged=1` redirects to /rooms and drops the parameter, so buyers see no confirmation (pre-existing).
7. **SignupWelcome** can appear over `/rooms/join` and `/rooms/[id]` for new free users; consider suppressing it on invite and room routes.
8. **Purchase price** isn't stored on the profile, so billing shows the purchase date only.

## Motion, media and performance

- Scroll scenes: `useScrub` and `useFrameSequence` (homepage hero scrubs 25 WebP frames, pinned on desktop and following the art on phones, after `load`, skipped with reduced motion, the pause toggle or Save-Data). First-paint reveals are CSS keyframes; scroll reveals go through `RevealObserver`.
- Renders were made with `design-handoff/3d-source` (build tool only, never shipped).
- Lighthouse on a local production build (October 2026): desktop LCP 0.8–0.9 s on the homepage, colleges, pricing and a hall page. Mobile (simulated slow 4G, 4x CPU) LCP is 3.7–4.4 s, while the same pages paint their LCP in about 0.1 s unthrottled; the hero images load at high priority and weigh 15–28 KB. What remains is shared JavaScript before paint (PostHog, Supabase, the school index pulled in by client-side search); lazy-loading PostHog or a small search API would help but changes data flows, so ask the owner first.

## SEO and answer engines

- Every page has its own `<title>` again ("Elder Hall Room Dimensions, Northwestern | dormscape"); the root layout appends the brand. Pass `title` to `pageMetadata()` (`lib/seo.ts`); `absoluteTitle` is for a title that already carries the brand (the homepage). A layout that sets a title must restate the template (see `app/plan/layout.tsx`).
- Templated descriptions go through `fitDescription()`, which picks the longest version within a search snippet.
- Canonicals on every indexable page; login, the plan result screen and the planner steps stay out of the index (steps point their canonical at `/plan`). `/plan/draw` is in the sitemap.
- Structured data: Organization, WebSite and WebApplication (with the Free, Plus and Pro offers from `lib/plan`) on the homepage and pricing; hall pages list each published room type as a schema.org `Room` with its floor size; FAQPage, BreadcrumbList, Article and BlogPosting as before.
- `/llms.txt` (`app/llms.txt/route.ts`) maps the site for AI crawlers from the school data and `lib/plan`.
- Owner actions: once this is on production, resubmit `https://dormscape.us/sitemap.xml` in Google Search Console and request indexing for the homepage and `/colleges`. Backlinks (press, partner schools) are outreach, not code.

## Security review (October 2026)

Fixed in code: custom vibe generation (`/api/vibe/generate`) now requires a signed-in Pro account on the server; product lookups (`/api/product-lookup`) require sign-in; the login `next=` redirect only accepts same-origin paths as the browser parses them; the `X-Powered-By` header is off.

Owner actions:
1. Review and apply `docs/migrations/20261004_security_hardening.sql` in the Supabase SQL editor. The live database still lets the anon and signed-in roles call the credit and session functions (migrations 0012 and 0015 revoked EXECUTE from PUBLIC only), serves the `room_submissions_queue` view outside RLS, and allows any columns on a profile INSERT. Afterwards, Database > Advisors > Security should be clear of those.
2. Turn on Auth > Email > "Prevent use of leaked passwords".

Known and accepted: plan generation runs in the browser, so the credit check (`/api/plan/consume`) is enforced by the client and a determined user can skip it (fixing that means server-side generation, out of scope for the redesign); the rate limiter is per server instance; script-src allows 'unsafe-inline' (see next.config.ts) so React's escaping is the main XSS defence, and the only raw-HTML sinks are escaped JSON-LD and a constant script.
