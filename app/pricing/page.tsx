import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import PremiumNotify from "@/components/site/PremiumNotify";
import Room3DScene from "@/components/site/Room3DScene";
import UpgradeButton from "@/components/site/UpgradeButton";
import { PLUS_PRICE_USD, PRO_PRICE_USD, RECHARGE_PRICE_USD } from "@/lib/plan";

const DESCRIPTION =
  "The Dormscape planner is free forever. Plus is a one-time $7.99 unlock (5 plan credits, all vibes, all features, recharge for $4.99). Pro is $19.99 for unlimited everything.";

export const metadata: Metadata = {
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing",
    description: DESCRIPTION,
    siteName: "Dormscape",
    type: "website",
    url: "/pricing",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Dormscape, the free AI dorm room planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

// Free-tier perks: only what genuinely ships today, and all of it is real.
const FREE_PERKS: React.ReactNode[] = [
  <>
    Real room dimensions for{" "}
    <Link
      href="/colleges"
      className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
    >
      supported schools
    </Link>
  </>,
  <>Unlimited room plans, no credits needed</>,
  <>5 vibes: Minimalist, Cozy Aesthetic, Preppy, Academia, Y2K Cyber</>,
  <>Budget-aware product picks with live Amazon links</>,
  <>Drag-and-drop 2D layout that fits to the inch</>,
  <>Save your designs and share them with a link</>,
  <>No account needed to start planning</>,
];

// Plus perks: the one-time unlock. Credits meter new plans; features are forever.
const PLUS_PERKS: { title: string; body: string }[] = [
  {
    title: "5 plan credits to start",
    body: "Each new room plan you generate spends one credit. Out of credits? Recharge 5 more for $4.99, anytime.",
  },
  {
    title: "All 9 vibes",
    body: "Gamer, Team Spirit, Retro, and Pastel, on top of the five styles everyone gets free.",
  },
  {
    title: "PDF and PNG export",
    body: "Download your shopping list as a clean PDF, or your room layout as an image.",
  },
  {
    title: "Compare two designs side by side",
    body: "Line up two rooms with their budgets and totals to settle which one wins.",
  },
  {
    title: "Priority on add-my-school requests",
    body: "Your school jumps to the front of the queue when we build the next batch.",
  },
];

// Pro perks: the ceiling. Unlimited, everything, no metering.
const PRO_PERKS: { title: string; body: string }[] = [
  {
    title: "Unlimited room plans",
    body: "Generate as many rooms as you want. No credits, no counting, no recharges, ever.",
  },
  {
    title: "Everything in Plus",
    body: "All 9 vibes, PDF and PNG export, side-by-side comparison, and priority school requests.",
  },
  {
    title: "One and done",
    body: "A single payment unlocks it all for good. No subscription, nothing to renew.",
  },
];

// Room in 3D roadmap perks: future tense on purpose, none of this ships yet.
const PREMIUM_PERKS: { title: string; body: string }[] = [
  {
    title: "Walk around your room in true 3D",
    body: "Spin it, drop to eye level, and see the space from any angle instead of just top-down.",
  },
  {
    title: "Plan live with your roommate",
    body: "Edit the same room together in real time, from different couches. Changes sync as you make them.",
  },
  {
    title: "Swap finishes and see them render",
    body: "Try a different rug, bedding, or wall color and watch the room update in 3D before you buy.",
  },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-5 w-5 shrink-0 text-cobalt"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The ink "coming soon" pill with the highlight lock, echoing the Room in 3D
// nav item and its teaser modal.
function SoonPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 text-highlight"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
      </svg>
      Coming soon
    </span>
  );
}

function PerkList({ perks, dotted = false }: { perks: { title: string; body: string }[]; dotted?: boolean }) {
  return (
    <ul className="mt-4 space-y-4">
      {perks.map((perk) => (
        <li key={perk.title} className="flex gap-3">
          {dotted ? (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber" aria-hidden="true" />
          ) : (
            <CheckIcon />
          )}
          <span>
            <span className="block text-[15px] font-semibold leading-snug text-ink">
              {perk.title}
            </span>
            <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-soft">
              {perk.body}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  return (
    <div>
      <Nav />
      <main className="relative">
        <div
          className="grid-paper grid-paper-fade absolute inset-x-0 top-0 -z-10 h-[26rem]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Free to plan. <span className="hl">Pay once to go further.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              The planner is free forever, the whole thing, no trial and no
              paywall. When you want the locked vibes and the export, comparison,
              and priority tools, Plus is a one-time{" "}
              <span className="font-semibold text-ink">${PLUS_PRICE_USD.toFixed(2)}</span>{" "}
              and Pro is{" "}
              <span className="font-semibold text-ink">${PRO_PRICE_USD.toFixed(2)}</span>{" "}
              for unlimited. No subscriptions, ever.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
            {/* FREE TIER: the real, active product. Reads complete on its own. */}
            <section className="flex h-full flex-col rounded-2xl border border-ink/12 bg-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">Free</h2>
                <span className="inline-flex items-center rounded-full bg-ink/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  No card
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tracking-tight">$0</span>
                <span className="text-ink-soft">forever</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Plan as many rooms as you like, no account required.
              </p>

              <Link
                href="/plan"
                className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-cobalt"
              >
                Plan my room
              </Link>

              <div className="mt-7 border-t border-ink/8 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Everything included
                </p>
                <ul className="mt-4 space-y-3">
                  {FREE_PERKS.map((perk, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                      <CheckIcon />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto border-t border-ink/8 pt-6">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  The planner is free forever, no trial timer. The paid tiers add
                  the locked vibes and the export, comparison, and priority tools.
                </p>
              </div>
            </section>

            {/* PLUS TIER: the recommended paid tier. One-time $7.99, cobalt
                border + "Most popular" ribbon to stand out without diminishing
                Free. */}
            <section className="relative flex h-full flex-col rounded-2xl border-2 border-cobalt bg-card p-6 shadow-[0_24px_60px_-30px_rgba(43,78,255,0.55)] sm:p-8">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cobalt px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                Most popular
              </span>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Plus<span className="text-cobalt">+</span>
                </h2>
                <span className="inline-flex items-center rounded-full bg-highlight px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
                  One time
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tracking-tight">
                  ${PLUS_PRICE_USD.toFixed(2)}
                </span>
                <span className="text-ink-soft">once</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                A single unlock, not a subscription. Recharge credits for $
                {RECHARGE_PRICE_USD.toFixed(2)} whenever you run low.
              </p>

              <div className="mt-6">
                <UpgradeButton
                  type="plus"
                  className="rounded-xl bg-cobalt px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-cobalt-deep"
                />
              </div>

              {/* How credits work: the one bit of this model worth spelling out. */}
              <div className="mt-6 rounded-xl border border-cobalt/20 bg-cobalt/5 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-ink">
                  <span className="font-semibold">How credits work:</span> one
                  credit is spent each time you generate a new room plan. Run out
                  and you can recharge, but your saved designs, exports, and
                  comparisons keep working, credits or not.
                </p>
              </div>

              <div className="mt-6 border-t border-ink/8 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Everything in Free, plus
                </p>
                <PerkList perks={PLUS_PERKS} />
              </div>
            </section>

            {/* PRO TIER: the ceiling. Unlimited everything, amber-accented as the
                top, most complete option. */}
            <section className="relative flex h-full flex-col rounded-2xl border border-amber/50 bg-card p-6 shadow-[0_24px_60px_-34px_rgba(240,177,0,0.55)] sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Pro
                </h2>
                <span className="inline-flex items-center rounded-full bg-amber/15 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
                  Unlimited
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tracking-tight">
                  ${PRO_PRICE_USD.toFixed(2)}
                </span>
                <span className="text-ink-soft">once</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                The complete Dormscape. Every feature, unlimited plans, no credits
                to ever think about.
              </p>

              <div className="mt-6">
                <UpgradeButton
                  type="pro"
                  className="rounded-xl bg-ink px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-cobalt"
                />
              </div>

              <div className="mt-7 border-t border-ink/8 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Everything in Plus, plus
                </p>
                <PerkList perks={PRO_PERKS} />
              </div>

              <div className="mt-auto border-t border-ink/8 pt-6">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  Best if you are planning more than a couple of rooms, or just
                  never want to see a credit counter.
                </p>
              </div>
            </section>
          </div>

          {/* ROADMAP: Room in 3D. Not a pricing tier, honestly not shipped yet;
              kept here so the coming-soon teaser and notify-me still live on the
              pricing page. */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-ink/12 bg-card p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl font-extrabold tracking-tight">
                    Room in 3D
                  </h2>
                  <SoonPill />
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  On the roadmap, not a tier yet: your room and your
                  roommate&rsquo;s, in one shared 3D space you can actually walk
                  through. We haven&rsquo;t set a price, and early interest helps
                  us pick a fair one.
                </p>
                <div className="mt-5">
                  <PerkList perks={PREMIUM_PERKS} dotted />
                </div>
                <div className="mt-6 border-t border-ink/8 pt-6">
                  <p className="text-sm font-semibold text-ink">Want it the day it drops?</p>
                  <p className="mb-4 mt-1 text-[14px] leading-relaxed text-ink-soft">
                    Leave your email and we&rsquo;ll tell you the moment Room in 3D
                    goes live.
                  </p>
                  <PremiumNotify />
                </div>
              </div>
              <div>
                <Room3DScene />
              </div>
            </div>
          </section>

          {/* Trust strip: why the core stays free. */}
          <div className="mt-6 rounded-xl border border-dashed border-ink/20 bg-card/60 p-6 text-center">
            <p className="text-[15px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Why is the planner free?</span>{" "}
              Some shopping links are affiliate links that pay us a small
              commission at no extra cost to you. That keeps the whole tool free,
              and it&rsquo;s the entire business model.{" "}
              <Link
                href="/about"
                className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
              >
                More about how it works
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
