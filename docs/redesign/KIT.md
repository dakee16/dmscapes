# Redesign kit

How redesigned pages are built. The designs live in `design-handoff/` (local only, gitignored). The homepage (`app/page.tsx`, `components/home/`) and the colleges index (`app/colleges/page.tsx`, `components/colleges/`) are the reference implementations.

## Page skeleton

```tsx
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";

export const metadata = /* keep the page's existing metadata exactly */;

export default function Page() {
  return (
    <PageShell navOverlay>          {/* navOverlay when the hero is colored */}
      <JsonLd data={...} />         {/* keep existing structured data */}
      <PageHero
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow="Section · detail"
        lines={[{ text: "Display line", riso: true }, { text: "serif line.", serif: true }]}
        lede={<p>Live copy.</p>}
        art={{ src: "/redesign/site-….jpg", alt: "…", ratio: w / h }}
      >
        {/* actions */}
      </PageHero>
      <section className="ds-section"><div className="ds-wrap">…</div></section>
      <CtaBand lead="…" tail="…" note="…">{/* button */}</CtaBand>
    </PageShell>
  );
}
```

`PageShell` gives the `.ds` root, the site nav, `<main id="page-content">` and the footer. Don't render `Nav`/`Footer` yourself.

## Components (`components/ds/`)

| Component | Use |
|---|---|
| `PageShell` | page root; `navOverlay`, `navTone="dark"` for dark heroes |
| `PageHero` | hero: `bg`, `tone`, `crumbs`, `eyebrow`, `lines`, `lede`, children = actions, `art` (full-bleed render right) or `visual` (any node in a right column), `size="md"` for short heroes |
| `Headline` | two-voice heading. `lines: {text, serif?, riso?, className?}[]`. Add `className="ds-h2"` (or `ds-h1`, `ds-h3`, `ds-h2 ds-h2--inline` to run lines together). It animates in on scroll by itself |
| `Crumbs` | breadcrumbs; pass the same items as `breadcrumbJsonLd` |
| `TapeStats` | measuring-tape strip with 3–5 facts (counts from data only) |
| `CtaBand` | closing band: `lead`, `tail` (serif, yellow), `note`, children = button. `tone="ink" | "blue" | "amber"` |
| `SchoolSearch` | white pill school search; `to="plan" | "college"` |
| `Icons` | `ArrowRight`, `ArrowUpRight`, `Check`, `SearchIcon`, `MenuIcon`, `CloseIcon`, `ChevronDown` (fonts have no arrows; always use these) |
| `useScrub` | scroll-linked progress for scrubbed scenes (client only) |

## Global classes (`app/ds.css`)

- Layout: `ds-wrap` (max 1296 + gutters), `ds-section`, `ds-section--tight`, `ds-stack`
- Type: `ds-eyebrow`, `ds-lede`, `ds-mono`, `ds-display`, `ds-serif`, `ds-serif--blue`, `ds-riso`, `ds-num` (tabular), `ds-link`, `ds-sr` (screen-reader only)
- Buttons: `ds-btn` + `--ink`, `--ink-yellow`, `--blue`, `--yellow`, `--pink`, `--studio`, `--white`, `--ghost`, `--ghost-ink`; sizes `--sm`, `--lg`
- Surfaces: `ds-card` (white, hairline; `a.ds-card` lifts on hover), `ds-chip`, `ds-tag`, `ds-index-card`, `ds-plan-paper` (blue grid), `ds-tape`
- Forms: `ds-label`, `ds-input` (inputs and textareas)
- Data: `ds-table`
- Long text: `ds-prose` (legal, blog posts)

Tokens are CSS variables: `--ds-paper #F4F3EE`, `--ds-ink #16161D`, `--ds-blue #2449FF`, `--ds-blue-deep`, `--ds-yellow`, `--ds-tape`, `--ds-magenta`, `--ds-pink`, `--ds-red`, `--ds-sky`, `--ds-warm`, `--ds-sand`, `--ds-linen`, `--ds-rose`, `--ds-amber`, `--ds-night`, `--ds-void`, `--ds-body`, `--ds-muted`, `--ds-caption`, `--ds-line`, fonts `--ds-sans`, `--ds-serif`, `--ds-mono`, easing `--ds-ease`, `--ds-ease-back`, `--ds-gutter`, `--ds-max`, `--ds-nav-h`.

Martian Mono has no ′ ″ glyphs: set feet-and-inches in the sans.

## Motion (no client code needed)

Put these attributes on server-rendered elements; `RevealObserver` handles them, and they respect reduced motion and the site's pause toggle:

- `data-reveal=""` rise and fade at 20% in view; `"load"` plays on first paint (heroes)
- `data-reveal-img=""` the same with a slight scale settle
- `data-draw=""` a rule draws left to right; `data-grow=""` a to-scale rectangle grows from its corner; `data-bar=""` a bar grows from the left; `data-pop=""` a badge pops
- `data-count={n}` counts up once
- `data-stagger=""` on a parent spaces children 80 ms apart

## Rules

- Keep every URL, `metadata`, canonical, OG image and JSON-LD exactly as the page had them.
- Keep logic: forms, server actions, API calls, auth, Stripe, PostHog events, affiliate links. Restyle around them.
- Live copy wins over design copy where they differ. Never invent stats; counts come from `lib/schools.ts` / `lib/plan.ts`. Legal text stays word for word.
- Images: `next/image` from `/public/redesign/`, with real alt text.
- Each page gets its own CSS module in `components/<page>/`.
- When a page is converted, remove its old page-scoped rules from `app/experience.css` (selectors with `data-page="<page>"`).
- Check every page at 1440 and 390 wide before calling it done.
