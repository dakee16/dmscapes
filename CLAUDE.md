@AGENTS.md

## Redesign

The whole front end is being rebuilt from `design-handoff/`. Read `design-handoff/README.md` first, then `NOTES.md` and `MOTION.md`, then the `.dc.html` files for whatever you're building. Those files are the spec (desktop 1440, phone 390): match layout, type, colors, spacing and copy, rebuilt as responsive Next.js + TypeScript + Tailwind components.

- All work goes on the `redesign` branch. Nothing merges to `main` until the owner says so. Make small, clearly named commits and push as you go so the Vercel preview stays current.
- Keep everything working: Supabase auth (Google and email), Stripe checkout and credits, saving, generation, Amazon affiliate links with our tag, PostHog events, Resend emails. Restyle around existing logic; change data flows only where a new feature needs it.
- Prices, credits and plan features come from code (`lib/plan.ts`) and Stripe config, never from numbers in the designs. School, hall and room counts and dimensions come from the school data (`lib/schools.ts`), never hardcoded.
- Keep live copy where it exists. Don't invent stats. Legal page text stays as it is.
- Planner: restyle the existing Konva canvas; don't change how planning or generation works.
- Supabase: write migrations as files in `docs/migrations/` and show them to the owner before applying anything. Never run migrations, seeds or writes against the production database.
- Renders: convert to AVIF/WebP and serve stills with `next/image`. The three.js scenes in `design-handoff/3d-source` are a build tool only; never ship three.js for these images.
- Order: foundation, homepage, planner, site pages, My Room, final pass. Stop for the owner's review after the homepage, the planner, the site pages and My Room.
