# Redesign handoff (for Claude Code)

State of the `redesign` branch and what's left. Read `KIT.md` before building anything.

## Done on this branch

| Area | Files |
|---|---|
| Foundation: fonts, tokens, motion system, nav, footer | `app/ds.css`, `app/layout.tsx`, `components/ds/*`, `components/Nav.tsx`, `components/Footer.tsx` |
| Homepage | `app/page.tsx`, `components/home/*`, `lib/home-data.ts` |
| Colleges, college, hall | `app/colleges/**`, `components/colleges/*`, `components/college/*`, `components/hall/*`, `lib/room-preview.ts`, `lib/school-names.ts` |
| Pricing | `app/pricing/page.tsx`, `components/pricing/*`, `components/site/UpgradeButton.tsx` |
| About, methodology, contact, add school | `app/{about,methodology,contact,add-school}`, `components/{about,methodology,contact,add-school}` |
| FAQ, blog, post | `app/faq`, `app/blog/**`, `components/{faq,blog}`, `content/blog/how-to-measure-your-dorm-room.tsx` (checklist wrapper only) |
| Terms, privacy, cookies, 404, report, thank-you | `app/{terms,privacy,cookies,report,thank-you}`, `app/not-found.tsx`, `components/{legal,not-found,report}` |

Every converted page keeps its URL, metadata, canonical, OG image and JSON-LD. Legal text is unchanged word for word (checked block by block against the old pages).

## Yours

In this order, stopping for the owner's review after each:

1. **Planner**: `/plan`, `/plan/style`, the new `/plan/budget` step, `/plan/result`, `/plan/draw`, `/plan/draw/3d`, `/plan/create-vibe`. Restyle the Konva canvas; don't change planning or generation. Add `/plan/budget` to the PostHog funnel events.
2. **My Room**: `/my-room` (Pro home, gate and setup) and `/rooms` → "My designs". Keep `/rooms/[id]` and `/rooms/join` URLs exactly. Designs: `design-handoff/designs/my-room/`.
3. **Account**: `/account`, `/account/billing`, `/account/settings`, `/account/compare`, `/account/deleted`, `/login`, `/reset-password`, and the share page `/room/[id]`.
4. **End-to-end with real keys**: Stripe checkout from `/pricing` (Plus, Pro) and `/account/billing` (recharge, Flex), auth (Google and email), contact, add-school and report submissions, saving, generation, LiveKit voice, Resend emails, PostHog events, Amazon tag on every product link.

## Decisions already made (from the approved plan)

- Invites: email only, no open room link or short URL. Show "Copy invite link" only if the email binding stays; otherwise "Resend invite".
- Versions: keep the 5-minute checkpoints and the last 20; record who made each change and a summary; checkpoint before every restore; copy reads "Saved as you go".
- Item status: Not yet / Ordered / Packed, stored with the item. No relationship label.
- Planner generating screen: no fake percentage; a preset animation under about 1.5 s with a skip.
- The voice ring shows only when that person is in the room.
- Counts come from data; strike-through prices come from `lib/plan.ts`.
- Restyle the credits/profile menu to match the nav.
- Supabase: migrations as files in `docs/migrations/`, shown to the owner before anything is applied. Never write to production.

## Follow-ups left for you

- **Homepage My Room CTA**: `components/home/TogetherSection.tsx` links "Open My Room" to `/rooms`. Switch it to `/my-room` once that page exists.
- **Remove dead code after the planner and account pages move over**: `components/experience/*` (old homepage pieces), `components/site/{HeroSearch,RoomPlans,HomeFaq,CampusDirectory,SiteHeader,Breadcrumbs,Reveal,HeroParallax,…}` once nothing imports them, the old fonts in `app/layout.tsx` (Syne, Instrument Sans, Plex Mono, Bricolage, Instrument Serif), and `app/experience.css` rules for converted pages. `strip_legacy`-style removal: delete rules scoped to `data-page="<page>"` once the page is converted.
- **`components/products/FeedbackForm.tsx`** (used on thank-you) still has the old styling; restyle it with the planner.
- **Thin blue scroll-progress line** (`.dm-progress` in `MotionProvider`) still shows on every page; posts hide it in favor of the tape reading bar. Decide whether to keep it site-wide.
- **Blog upkeep**: a new post needs its `faqTopic` mapped in `components/blog/topics.ts` (for the filters) and an entry there for its serif title tail; covers fall back to a generic plan cover.
- **Cookie banner** (`components/site/CookieConsent.tsx`) still has the old look, and because it mounts after hydration it can become the mobile LCP element on a first visit (pricing on a phone measured 4.2 s with it showing, 1.4 s without). Restyle it, and consider rendering its text on the server.

## Motion and media notes

- Scroll scenes use `useScrub` (smoothed progress) and `useFrameSequence` (canvas image sequences). The homepage hero scrubs 25 WebP frames (`public/redesign/seq/hero-NN.webp`, about 1 MB) on desktop only, loaded after `load`, skipped with reduced motion, the pause toggle, or Save-Data.
- `data-*="load"` reveals are pure CSS keyframes (no hydration flash). Scroll reveals go through `RevealObserver`.
- The 3D renders come from `design-handoff/3d-source` (build tool only). `site-hall-clay-room.jpg` is a label-free clay render, because a render with baked-in dimensions can't be honest on 1,361 different hall pages.

## Performance (production build, 4× CPU, 1.6 Mbps, 150 ms RTT)

| Page | Phone LCP | Desktop LCP | CLS |
|---|---|---|---|
| Home (redesign) | 2.2 s | 1.7–2.1 s | < 0.01 |
| Home (main, before) | 3.4 s | 3.4 s | 0 |
| College | 1.7 s | 1.7 s | < 0.01 |

The biggest remaining cost is JavaScript every page loads: PostHog (in a ~400 KB chunk), Supabase (~230 KB), and the full school index (~600 KB raw) pulled in by the client-side college search. Lazy-loading PostHog or moving school search to a small API would help most, but both change data flows, so they need the owner's OK.
