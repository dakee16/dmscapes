import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import PlanCta from "@/components/site/PlanCta";
import { SCHOOLS } from "@/lib/schools";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dormscape is a free dorm room planner built on real dorm dimensions from official housing data. See your exact room, set a budget, shop a list that fits.",
  openGraph: {
    title: "About dormscape",
    description:
      "The free dorm room planner built on real dorm dimensions. Why it exists, how it works, and how it stays free.",
    siteName: "Dormscape",
    type: "website",
    url: "/about",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Dormscape, the free AI dorm room planner",
      },
    ],
  },
};

// Inline text links reuse the highlight-underline treatment from /plan.
const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

// Real, shipped numbers only (no invented claims): the floored dorm-layout
// count mirrors the "1,500+" figure cited on the homepage and pricing page.
const LAYOUTS =
  Math.floor(
    SCHOOLS.reduce((n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0), 0) / 100
  ) * 100;

// Shared mono stat-line label treatment (uppercase, letter-spaced).
const STAT_LABEL = "mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft";

// The "how it works" mini-section: three short steps with simple line icons,
// echoing the homepage flow, to give the page rhythm instead of one text block.
const STEPS: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Pick your school",
    body: "We already have your building and room, pulled from official housing data.",
    icon: (
      <path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-4h4v4M9.5 11h.01M14.5 11h.01" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Choose a vibe and budget",
    body: "Set the look you want and the number you can spend. The plan stays inside it.",
    icon: (
      <path d="M4 7h16M4 12h10M4 17h7M17 14l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Get a layout and list",
    body: "A room arranged to the inch, plus real products with live links you can shop.",
    icon: (
      <path d="M4 5h16v14H4zM4 10h16M9 5v14" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export default function AboutPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[28rem]" />
      <main className="relative">
        <div className="mx-auto max-w-[50rem] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            About dormscape
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            The dorm planner that knows <span className="hl">your dorm.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Dormscape is a free dorm room planner. Pick your school and building,
            and you get your actual room: real dimensions, a layout you can
            rearrange, and a shopping list that fits the space and the budget.
          </p>

          {/* Real-number stat callouts, in the site's mono stat-line language. */}
          <div className="mt-10 grid grid-cols-3 gap-4 rounded-2xl border border-ink/10 bg-card/70 px-4 py-6 sm:px-8">
            <div>
              <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {SCHOOLS.length}
              </p>
              <p className={STAT_LABEL}>Schools supported</p>
            </div>
            <div className="border-x border-ink/8 px-2 text-center sm:px-4">
              <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {LAYOUTS.toLocaleString()}+
              </p>
              <p className={STAT_LABEL}>Dorm layouts mapped</p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                200+
              </p>
              <p className={STAT_LABEL}>Rooms planned</p>
            </div>
          </div>

          {/* The problem */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              The problem: buying blind
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Every fall, freshmen furnish a room they&rsquo;ve never stood in. The
              results are predictable. Rugs that don&rsquo;t unroll all the way. Two
              mini fridges. A storage cart with nowhere to stand.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              The usual fix is a dozen browser tabs: a generic packing list, a
              housing PDF, three store carts, and a group chat poll. Hours of work
              to still end up guessing.
            </p>
          </section>

          {/* What it does */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              What Dormscape does
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              We do the tape-measure homework. Dormscape starts from your exact
              room, with dimensions pulled from official university housing data
              for{" "}
              <Link href="/colleges" className={TEXT_LINK}>
                {SCHOOLS.length} schools
              </Link>{" "}
              and counting.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              From there you pick a style that feels like you, set a budget, and
              get a layout plus a list of real products that fit it. Drag the
              furniture around, swap products, share the result. That&rsquo;s the
              pitch. The proof is in{" "}
              <Link href="/plan" className={TEXT_LINK}>
                the planner
              </Link>
              .
            </p>
          </section>

          {/* Why it's different */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Why it&rsquo;s not another checklist
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-ink/10 bg-card p-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-cobalt">
                  Real dimensions
                </p>
                <h3 className="mt-2 font-display text-base font-bold tracking-tight">
                  Measured, not guessed.
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  Room sizes come from official housing data, school by school.
                  When a college doesn&rsquo;t publish a number, we leave it blank
                  instead of inventing one.
                </p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-card p-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-cobalt">
                  Visual layout
                </p>
                <h3 className="mt-2 font-display text-base font-bold tracking-tight">
                  A room, not a list.
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  You see your stuff in your floor plan before you buy any of it.
                  The rug that doesn&rsquo;t fit gets caught on screen, not on
                  move-in day.
                </p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-card p-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-cobalt">
                  Budget first
                </p>
                <h3 className="mt-2 font-display text-base font-bold tracking-tight">
                  Your number, respected.
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  Set a budget up front and the plan stays inside it. Every item
                  is a real product with a live link, not stock-photo
                  inspiration.
                </p>
              </div>
            </div>
          </section>

          {/* Who it's for */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Who it&rsquo;s for
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Incoming freshmen, mostly. If you just committed and the roommate
              group chat is already debating mini fridges, you&rsquo;re exactly who
              we built this for. Students moving into first apartments are next on
              the list. Same idea, more rooms.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              School not on{" "}
              <Link href="/colleges" className={TEXT_LINK}>
                the list
              </Link>{" "}
              yet?{" "}
              <Link href="/add-school" className={TEXT_LINK}>
                Add it
              </Link>{" "}
              and we&rsquo;ll get measuring.
            </p>
          </section>

          {/* Free, honestly */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Free, actually
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              No account needed to plan a room. No paywall on the layout. Some
              shopping links are affiliate links, which pay us a small commission
              at no extra cost to you, and that keeps the core planner free.{" "}
              <Link href="/pricing" className={TEXT_LINK}>
                Plus and Pro
              </Link>{" "}
              are optional one-time upgrades ($7.99 and $19.99) for extras like
              all nine vibes, PDF and PNG export, and the comparison view, but
              nothing in the free planner is locked behind them.
            </p>
          </section>

          {/* How it works: short, icon-led steps for structural rhythm. */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-ink/10 bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cobalt/10 text-cobalt">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        {step.icon}
                      </svg>
                    </span>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Closing CTA card, matching the homepage's ink CTA treatment. */}
          <section className="mt-14">
            <div className="relative overflow-hidden rounded-2xl bg-ink px-6 py-12 text-center sm:px-12 sm:py-14">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
                aria-hidden="true"
              />
              <p className="relative font-mono text-xs font-medium uppercase tracking-[0.18em] text-highlight">
                Enough reading
              </p>
              <h2 className="relative mx-auto mt-3 max-w-xl font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Your exact room is one tap away.
              </h2>
              <div className="relative mt-7">
                <PlanCta className="inline-flex h-13 items-center rounded-xl bg-highlight px-8 text-base font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:translate-y-0" />
              </div>
              <p className="relative mt-4 font-mono text-[11px] uppercase tracking-wide text-white/60">
                Free · No account · Under a minute
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
