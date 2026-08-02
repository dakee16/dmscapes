# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: an incoming college student, most often a first-year, planning a
dorm room before move-in, frequently before they have ever stood in the space.
They plan over the summer, often on a phone, and want a room that fits and a
list they can buy fast.

Two secondary audiences future work must also serve:

- Parents, who co-shop and often pay. The voice stays student-first, but cost
  clarity and trust must stay legible for the adult buyer.
- Resident advisors and housing staff, who may plan across multiple rooms.

## Product Purpose

Dormscape is a free dorm room planner built on real dorm dimensions from
official housing data. The student picks their school and building, gets their
actual room at true dimensions, arranges a layout that fits on a canvas, and
receives a shoppable Amazon list matched to the space and their budget.

It exists to end "buying blind" for a room you have never seen. Success is a
student who arrives with furniture and decor that actually fit, sourced in about
a minute of planning.

## Positioning

The differentiator a neighboring product cannot truthfully copy: real,
building-specific dorm dimensions sourced from official housing data, so the
plan is for the student's exact room rather than a generic template. Both the
layout and the budget-fit shopping list are generated against those true
dimensions.

## Operating Context

- Used pre-move-in, typically over the summer before fall term, often on mobile,
  sometimes side by side with a parent.
- Core flow: pick school and building, choose a vibe, set a budget, get a
  rearrangeable room layout plus a shoppable Amazon list that fits.
- Amazon links carry an affiliate tag; those purchases fund the free product.
- 16 schools are live today with real per-room dimensions across their dorms.
  The catalog expands over time (Purdue dimensions are in progress). Where exact
  dimensions are unavailable, a best-fit fallback is shown with an "estimated"
  note rather than a false precise number.

## Capabilities and Constraints

- Three access tiers: Free (unlimited plans, a subset of vibes, save and share),
  Plus (7.99 one-time: 5 plan credits, all vibes, premium features unlocked
  permanently, plus a 5-credit recharge for 4.99), and Pro (19.99 one-time:
  unlimited credits, everything).
- Premium features gated above Free: PDF and PNG export, side-by-side plan
  comparison, and priority school requests.
- 9 vibes: Minimalist, Cozy, Preppy, Academia, Y2K, Gamer, Retro, Pastel, Boho.
  Boho is de-emphasized in forward-facing selection.
- Accounts are limited to 2 concurrent sessions.
- Auth via Supabase, one-time payments via Stripe Checkout, product analytics via
  PostHog, layout canvas via Konva, PDF export via jsPDF.
- Technical constraint: this Next.js is a custom build with breaking changes from
  public releases (see AGENTS.md); consult node_modules/next/dist/docs before
  writing framework code.
- Roadmap posture: "Room in 3D" and roommate coordination appear as "Soon"
  teasers but are not committed directions. Treat them as speculative; do not
  plan product decisions around them until confirmed.

## Brand Commitments

- Name: Dormscape. Domain: dormscape.us.
- Voice: plain, confident, student-first, lightly witty. Short sentences, no
  hype, no scarcity language.
- Binding copy rule: no em dashes and no en dashes anywhere in user-facing copy.
- In-use lines: "The dorm planner that knows your dorm." and the hero "Your
  dorm, planned to the inch."
- Free core is a binding promise: the plan-my-room core stays free permanently,
  funded by Amazon affiliate links plus optional one-time upgrades. It is never
  paywalled.
- Visual identity (grid-paper texture, palette, typefaces) is design-world truth
  and is recorded via DESIGN.md / `document`, not here.

## Evidence on Hand

- Real assets: 16 schools with building-level room dimensions from official
  housing data (roughly 1,026 room configurations across their dorms); a real
  per-style Amazon product catalog with live affiliate links; the brand
  logo/wordmark in public/icons.
- No social proof exists yet: no user counts, testimonials, ratings, reviews,
  press, or school partnerships. Future marketing must not fabricate any of
  these. Only genuinely true, data-derived numbers may be cited, for example
  "16 schools" or "1,000+ dorm room layouts."

## Product Principles

1. Real over generic. Every plan is anchored to the student's actual room
   dimensions; when data is missing, label the estimate honestly.
2. Free stays free. The core planner is permanently free, funded by affiliate
   links plus optional one-time upgrades, never by paywalling the core job.
3. Honesty in claims. No fabricated stats, reviews, guarantees, or scarcity;
   only true, sourced numbers.
4. Speed to a usable result. A student should reach a fitting layout and a
   shopping list in about a minute, mobile-first.
5. Student-first, buyer-aware. Speak to the student, but keep cost and trust
   legible for the parent who often pays.

## Accessibility & Inclusion

No formal standard has been confirmed as a commitment. The incumbent build
already respects prefers-reduced-motion, ships visible keyboard focus rings, and
uses aria attributes on decorative and interactive elements; future work should
preserve that baseline.
