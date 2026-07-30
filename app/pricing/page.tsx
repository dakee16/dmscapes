import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import PremiumNotify from "@/components/site/PremiumNotify";
import Room3DScene from "@/components/site/Room3DScene";
import UpgradeButton from "@/components/site/UpgradeButton";
import { PLUS_PRICE_USD } from "@/lib/plan";

const DESCRIPTION =
  "The Dormscape planner is free forever. Plus is a one-time $4.99 unlock for unlimited saves, PDF export, and side-by-side comparison. Room in 3D is coming soon.";

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
  <>6 free styles: Minimalist, Cozy Aesthetic, Boho, Preppy, Academia, Y2K Cyber</>,
  <>Budget-aware product picks with live Amazon links</>,
  <>Drag-and-drop 2D room layout that fits to the inch</>,
  <>Save one design to your free account</>,
  <>Share any design with a link</>,
  <>No account needed to start planning</>,
];

// Plus perks: the four things the one-time upgrade unlocks.
const PLUS_PERKS: { title: string; body: string }[] = [
  {
    title: "Save unlimited designs",
    body: "Free keeps one on file. Plus lets you save every look you're weighing and decide later.",
  },
  {
    title: "4 exclusive design styles",
    body: "Gamer, Team Spirit, Retro, and Pastel, on top of the six styles everyone gets free.",
  },
  {
    title: "Download your list as a PDF",
    body: "A clean, printable shopping list, prices and totals, to send whoever's funding the run.",
  },
  {
    title: "Compare two designs side by side",
    body: "Line up two rooms with their budgets and details to settle which one wins.",
  },
  {
    title: "Priority on add-my-school requests",
    body: "Your school request jumps to the front of the queue when we build the next batch.",
  },
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
              Free to plan. <span className="hl">Plus to go further.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              The planner is free forever, the whole thing, no trial and no
              paywall. Plus is a one-time{" "}
              <span className="font-semibold text-ink">
                ${PLUS_PRICE_USD.toFixed(2)}
              </span>{" "}
              unlock for people who want to save more, export, and compare. Room
              in 3D is the big one, and it&rsquo;s still on the way.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
            {/* FREE TIER: the real, active product. Reads complete on its own. */}
            <section className="flex h-full flex-col rounded-2xl border border-ink/12 bg-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Free
                </h2>
                <span className="inline-flex items-center rounded-full bg-ink/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  No card
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
                  The planner itself is free forever, no trial timer and nothing
                  locked. The only cap is one saved design, and Plus lifts it.
                </p>
              </div>
            </section>

            {/* PLUS TIER: the recommended paid tier. A one-time $4.99 unlock,
                cobalt border + "Most popular" ribbon to make it the standout
                without diminishing Free. */}
            <section className="relative flex h-full flex-col rounded-2xl border-2 border-cobalt bg-card p-6 shadow-[0_24px_60px_-30px_rgba(43,78,255,0.55)] sm:p-8">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cobalt px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                Most popular
              </span>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Plus
                  <span className="text-cobalt">+</span>
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
                A single unlock, not a subscription. No renewal, no card kept on
                file after.
              </p>

              <div className="mt-6">
                <UpgradeButton className="rounded-xl bg-cobalt px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-cobalt-deep" />
              </div>

              <div className="mt-7 border-t border-ink/8 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Everything in Free, plus
                </p>
                <ul className="mt-4 space-y-4">
                  {PLUS_PERKS.map((perk) => (
                    <li key={perk.title} className="flex gap-3">
                      <CheckIcon />
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

              <div className="mt-auto border-t border-ink/8 pt-6">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  Applies to your account the moment payment clears. Every free
                  feature stays exactly as it is.
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
                <Room3DScene />
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
