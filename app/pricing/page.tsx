import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import PremiumNotify from "@/components/site/PremiumNotify";

const DESCRIPTION =
  "Dormscape is free: real room dimensions, all 6 styles, budget-aware picks, and a drag-and-drop layout. Room in 3D is the coming-soon premium tier.";

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

// Free-tier perks: only what genuinely ships today.
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
  <>All 6 styles: Minimalist, Cozy Aesthetic, Gamer, Boho, Preppy, Team Spirit</>,
  <>Budget-aware product picks with live Amazon links</>,
  <>Drag-and-drop 2D room layout that fits to the inch</>,
  <>Save as many designs as you want with a free account</>,
  <>Share any design with a link</>,
  <>No account needed to start planning</>,
];

// Premium ("Room in 3D") perks: future tense on purpose, since none of this
// ships yet. Built out from the existing Room in 3D coming-soon teaser.
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
    title: "Your side, their side",
    body: "Split the room, keep your budgets separate, and still land on one layout you both agree on.",
  },
  {
    title: "Swap finishes and see them render",
    body: "Try a different rug, bedding, or wall color and watch the room update in 3D before you buy.",
  },
  {
    title: "A shareable 3D walkthrough",
    body: "Send a link home so the people funding the mini fridge can actually picture the room.",
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

// Compact split-room sketch, reused from the Room in 3D teaser to build the
// same anticipation on the pricing page.
function SplitRoomSketch() {
  return (
    <div className="grid-paper relative overflow-hidden rounded-xl border border-dashed border-ink/25 bg-white">
      <svg viewBox="0 0 300 130" className="block w-full" aria-hidden="true">
        <rect x="20" y="14" width="260" height="102" rx="4" fill="none" strokeWidth="2.5" className="stroke-ink" />
        <line x1="150" y1="14" x2="150" y2="116" strokeWidth="1.5" strokeDasharray="5 5" className="stroke-ink/30" />
        <rect x="30" y="24" width="32" height="54" rx="3" strokeWidth="1.5" className="fill-cobalt/15 stroke-cobalt" />
        <rect x="30" y="88" width="44" height="18" rx="3" strokeWidth="1.5" className="fill-cobalt/15 stroke-cobalt" />
        <rect x="238" y="24" width="32" height="54" rx="3" strokeWidth="1.5" className="fill-highlight/40 stroke-amber" />
        <rect x="226" y="88" width="44" height="18" rx="3" strokeWidth="1.5" className="fill-highlight/40 stroke-amber" />
      </svg>
      <span className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-highlight" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
        </svg>
        3D · Coming soon
      </span>
    </div>
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
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Free now. <span className="hl">3D soon.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              The dorm planner is free today, the whole thing, with no trial and
              no paywall. The only paid tier is Room in 3D, and it isn&rsquo;t
              here yet. Here&rsquo;s exactly what each one includes.
            </p>
          </div>

          <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2">
            {/* FREE TIER: the real, active product. Highlighted so it never
                reads as the lesser option. */}
            <section className="flex h-full flex-col rounded-2xl border-2 border-cobalt/30 bg-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Free
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cobalt/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt">
                  <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
                  Your plan
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tracking-tight">
                  $0
                </span>
                <span className="text-ink-soft">forever</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                The real product, and all of it. No card, no catch.
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
                  Everything above is live right now. No trial timer, no locked
                  features, no upsell to plan your own room.
                </p>
              </div>
            </section>

            {/* PREMIUM TIER: aspirational but honestly not shipped. Coming-soon
                pill, TBA price, future-tense perks, notify-me capture. */}
            <section className="flex h-full flex-col rounded-2xl border border-ink/12 bg-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Room in 3D
                </h2>
                <SoonPill />
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tracking-tight text-ink/70">
                  TBA
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                We haven&rsquo;t set a price yet. Early interest helps us pick
                one that&rsquo;s fair, and you&rsquo;ll hear it first.
              </p>

              <div className="mt-6">
                <SplitRoomSketch />
              </div>

              <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">
                Everything in Free, plus the part people keep asking for: your
                room and your roommate&rsquo;s, in one shared 3D space you can
                actually walk through.
              </p>

              <div className="mt-6 border-t border-ink/8 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  What you&rsquo;ll unlock
                </p>
                <ul className="mt-4 space-y-4">
                  {PREMIUM_PERKS.map((perk) => (
                    <li key={perk.title} className="flex gap-3">
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber"
                        aria-hidden="true"
                      />
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
              </div>

              <div className="mt-7 border-t border-ink/8 pt-6">
                <p className="text-sm font-semibold text-ink">
                  Want it the day it drops?
                </p>
                <p className="mt-1 mb-4 text-[14px] leading-relaxed text-ink-soft">
                  Leave your email and we&rsquo;ll tell you the moment Room in 3D
                  goes live.
                </p>
                <PremiumNotify />
              </div>
            </section>
          </div>

          {/* Trust strip: why the core stays free. */}
          <div className="mt-10 rounded-xl border border-dashed border-ink/20 bg-card/60 p-6 text-center">
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
