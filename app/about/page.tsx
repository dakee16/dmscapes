import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import { SCHOOLS } from "@/lib/schools";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dormscape is a free dorm room planner built on real dorm dimensions from official housing data. See your exact room, set a budget, shop a list that fits.",
  openGraph: {
    title: "About Dormscape",
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

export default function AboutPage() {
  return (
    <div>
      <Nav />
      <main className="relative">
        <div
          className="grid-paper grid-paper-fade absolute inset-x-0 top-0 -z-10 h-[28rem]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-[50rem] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            About Dormscape
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            The dorm planner that knows <span className="hl">your dorm.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Dormscape is a free dorm room planner. Pick your school and building,
            and you get your actual room: real dimensions, a layout you can
            rearrange, and a shopping list that fits the space and the budget.
          </p>

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

          {/* CTA */}
          <div className="mt-14 rounded-xl border border-dashed border-ink/20 bg-card/60 p-6 text-center">
            <p className="font-medium">Enough reading. Your room is waiting.</p>
            <Link
              href="/plan"
              className="mt-3 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Plan my room for free
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
