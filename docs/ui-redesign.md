# Dormscape UI redesign

The studio design extends the approved homepage direction through the existing
Next.js app. Brand colors, the product catalog, school records, planner state,
geometry, checkout, auth, API routes, and pricing rules remain unchanged.

## Design and motion

- `app/experience.css` contains the shared navigation, marketing, editorial,
  planner, account, and responsive presentation rules, prefixed with `dm-`.
- Local Syne and Instrument Serif pair with Instrument Sans, Bricolage for the
  wordmark, and IBM Plex Mono for measurements. Font licenses are colocated.
- `components/experience` contains the hero, scroll assembly, horizontal style
  gallery, dimensional blueprint artwork, and planner palette previews.
- `MotionProvider` honors the system motion preference and a persistent pause
  control. It accepts server-rendered children without remounting planner state.
- `RoomModel` lazily loads the local Three.js scene when near the viewport. It
  supports horizontal dragging and arrow keys. Offscreen rendering stops, and
  unmount disposes geometry, materials, observers, listeners, and the renderer.
- `public/experience/room.js` is loaded as a native browser module with the
  documented Next.js webpack/turbopack ignore annotations. Three.js 0.170.0 and
  RoundedBoxGeometry are served locally; the existing CSP remains unchanged.
- A local image stays visible if WebGL is unavailable. Room scenes are labeled
  illustrative style studies; actual saved layouts and the editable floor plan
  still use the original RoomCanvas geometry and product data.
- The two WebP style-study images come from the approved homepage preview.

## Validation

- `npm run build`: passes, including TypeScript and 889 generated pages.
- Production HTTP smoke checks: 27 public/planner/account route shells and five
  local 3D/image assets return successfully with skip targets and existing CSP.
- AST comparison: 36 existing control functions and 69 event handlers in the
  edited planner, account, reset, room, and product components are unchanged.
- `lib`, `data`, `templates`, `app/api`, `content`, package versions, lockfile,
  and `next.config.ts` have no changes.
- Native Three.js module imports and finite rounded-box geometry verified.
- `git diff --check`: clean.

Live authenticated purchases, credit consumption, and database writes are not
part of these checks. No production data was changed.
