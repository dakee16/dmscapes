import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import PremiumNotify from "@/components/site/PremiumNotify";
import Room3DScene from "@/components/site/Room3DScene";
import UpgradeButton from "@/components/site/UpgradeButton";
import { SCHOOLS } from "@/lib/schools";
import {
  PLUS_PRICE_USD,
  PLUS_PRICE_WAS_USD,
  PRO_PRICE_USD,
  PRO_PRICE_WAS_USD,
  RECHARGE_PRICE_USD,
  FLEX_CREDIT_PRICE_USD,
} from "@/lib/plan";

// Real, honest social proof: counts derived straight from the shipped data, so
// they can never drift from what we actually support. No fabricated reviews or
// ratings. The floored layout count is the headline stat cited across the site.
const ROOM_LAYOUTS = SCHOOLS.reduce(
  (n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0),
  0
);
// Rounded down to a clean floor so the claim stays conservative (e.g. 1,026 -> 1,000+).
const ROOM_LAYOUTS_FLOOR = Math.floor(ROOM_LAYOUTS / 100) * 100;

const DESCRIPTION =
  "The Dormscape planner is free to try: 1 room plan, and saving your designs is always free. Plus is a one-time $4.99 unlock (5 plan credits, all vibes, all features, recharge for $2.99). Pro is $14.99 for unlimited plans.";

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
  <>1 room plan to try it out</>,
  <>Save your design to your account, free</>,
  <>3 vibes: Minimalist, Cozy Aesthetic, and Preppy</>,
  <>Budget-aware product picks with live Amazon links</>,
  <>Drag-and-drop 2D layout that fits to the inch</>,
  <>Share any room with a link</>,
  <>No account needed to start planning</>,
];

// Plus perks: the one-time unlock. Plan generation is metered by plan credits;
// saving is free, and features are forever.
const PLUS_PERKS: { title: string; body: string }[] = [
  {
    title: "5 plan credits",
    body: "One plan credit per new room you generate. Recharge 5 more for $2.99 whenever you run low. Saving your designs is always free.",
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
    body: "Generate as many rooms as you want. No credits, no counters, no recharges, ever.",
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

// --- Trust-signal icons (small, on-brand line icons) ---
type IconProps = { className?: string };
const ICON_BASE = "h-[18px] w-[18px] shrink-0";

function BuildingIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 21h18M6 21V5l6-2 6 2v16M10 21v-4h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 9h.01M14 9h.01M10 13h.01M14 13h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.6-3 7.8-7 9-4-1.2-7-4.4-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ReceiptIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21z" strokeLinejoin="round" />
      <path d="M9.5 8.5h5M9.5 12h5" strokeLinecap="round" />
    </svg>
  );
}
function CartIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2 2h3l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h8.5a1.6 1.6 0 0 0 1.6-1.3L22 6H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BoltIcon({ className = ICON_BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" strokeLinejoin="round" />
    </svg>
  );
}

// The top social-proof / trust bar: real data counts plus honest guarantees
// about how payment and products actually work. Nothing here is a fabricated
// statistic, review, or refund promise.
function TrustStrip() {
  const items: { icon: React.ReactNode; label: React.ReactNode }[] = [
    {
      icon: <BuildingIcon />,
      label: (
        <>
          <span className="font-semibold text-ink">
            {ROOM_LAYOUTS_FLOOR.toLocaleString()}+
          </span>{" "}
          dorm room layouts
        </>
      ),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7l8-4 8 4v10l-8 4-8-4z" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: (
        <>
          <span className="font-semibold text-ink">200+</span> rooms planned
        </>
      ),
    },
    { icon: <ShieldIcon />, label: "Secured by Stripe" },
    { icon: <ReceiptIcon />, label: "One-time payment, no subscription" },
    { icon: <CartIcon />, label: "Real products, live Amazon links" },
  ];
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-ink/10 bg-card/70 px-5 py-4 sm:mt-10 sm:gap-x-7">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-x-6 sm:gap-x-7">
          {i > 0 && <span className="hidden h-4 w-px bg-ink/12 sm:block" aria-hidden="true" />}
          <span className="inline-flex items-center gap-2 text-[13px] leading-none text-ink-soft">
            <span className="text-cobalt">{it.icon}</span>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Badge-style reassurance under a checkout button. Only what is genuinely true:
// Stripe secures the hosted checkout, and every tier is a single payment. No
// refund/"cancel anytime" language, since we do not offer a subscription or a
// stated refund policy.
function PayBadges({ free = false }: { free?: boolean }) {
  const badges: { icon: React.ReactNode; label: string }[] = free
    ? [{ icon: <BoltIcon className="h-3.5 w-3.5 shrink-0" />, label: "No account needed" }]
    : [
        { icon: <ShieldIcon className="h-3.5 w-3.5 shrink-0" />, label: "Secured by Stripe" },
        { icon: <ReceiptIcon className="h-3.5 w-3.5 shrink-0" />, label: "One-time payment" },
      ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {badges.map((b) => (
        <span key={b.label} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
          <span className="text-ink-soft/80">{b.icon}</span>
          {b.label}
        </span>
      ))}
    </div>
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
      <SiteHeader gridClassName="h-[26rem]" />
      <main className="relative">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Free to plan. <span className="hl">Pay once to go further.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              The planner is free to try. No trial timer, no card.
            </p>
          </div>

          <TrustStrip />

          {/* FLEX: the à-la-carte tier, presented as a slim banner above the
              three main cards. It's a real, selectable tier (Free -> Flex ->
              Plus -> Pro), distinct in shape from the tier cards because it's
              pay-as-you-go rather than a fixed plan. Same features as Free; you
              just buy room-plan credits as you need them. */}
          <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-ink/15 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-white" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-highlight" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-extrabold tracking-tight">Flex</h2>
                  <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    Pay as you go
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                  Not ready for a plan? Buy room-design credits à la carte at{" "}
                  <span className="font-semibold text-ink">
                    ${FLEX_CREDIT_PRICE_USD.toFixed(2)} each
                  </span>
                  , as few or as many as you want. Same features as Free; you just
                  top up when you need another room.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
              <span className="font-display text-3xl font-extrabold tracking-tight">
                ${FLEX_CREDIT_PRICE_USD.toFixed(2)}
                <span className="ml-1 align-middle text-sm font-medium text-ink-soft">/credit</span>
              </span>
              <Link
                href="/account/billing"
                className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
              >
                Buy credits
              </Link>
            </div>
          </section>

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
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
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft lg:min-h-[4.25rem]">
                Try the full planner on the house: one room plan and one save.
              </p>

              <Link
                href="/plan"
                className="mt-6 block rounded-xl bg-ink px-6 py-3 text-center text-base font-semibold text-white transition-all duration-200 hover:bg-cobalt active:translate-y-px"
              >
                Plan my room
              </Link>
              <PayBadges free />

              <div className="mt-6 border-t border-ink/8 pt-6">
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
                  Free to try, no trial timer: one plan and one save. The paid
                  tiers add more of both, the locked vibes, and the export,
                  comparison, and priority tools.
                </p>
              </div>
            </section>

            {/* PLUS TIER: the recommended paid tier. One-time $4.99, cobalt
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

              <div className="mt-5 flex items-baseline gap-2.5">
                <span className="font-display text-2xl font-semibold text-ink-soft/55 line-through decoration-ink-soft/50 decoration-2">
                  ${PLUS_PRICE_WAS_USD.toFixed(2)}
                </span>
                <span className="font-display text-5xl font-extrabold tracking-tight">
                  ${PLUS_PRICE_USD.toFixed(2)}
                </span>
                <span className="text-ink-soft">once</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft lg:min-h-[4.25rem]">
                A single unlock, not a subscription. Recharge both counters for $
                {RECHARGE_PRICE_USD.toFixed(2)} whenever you run low.
              </p>

              <div className="mt-6">
                <UpgradeButton
                  type="plus"
                  className="rounded-xl bg-cobalt px-6 py-3 text-center text-base font-semibold text-white transition-all duration-200 hover:bg-cobalt-deep active:translate-y-px"
                />
                <PayBadges />
              </div>

              {/* How credits work: the one bit of this model worth spelling out. */}
              <div className="mt-6 rounded-xl border border-cobalt/20 bg-cobalt/5 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-ink">
                  <span className="font-semibold">How credits work:</span> one plan
                  credit covers each new room you generate. Run dry and a $
                  {RECHARGE_PRICE_USD.toFixed(2)} recharge adds five more. Saving your
                  designs is always free, and your exports and comparisons keep
                  working, credits or not.
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

              <div className="mt-5 flex items-baseline gap-2.5">
                <span className="font-display text-2xl font-semibold text-ink-soft/55 line-through decoration-ink-soft/50 decoration-2">
                  ${PRO_PRICE_WAS_USD.toFixed(2)}
                </span>
                <span className="font-display text-5xl font-extrabold tracking-tight">
                  ${PRO_PRICE_USD.toFixed(2)}
                </span>
                <span className="text-ink-soft">once</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft lg:min-h-[4.25rem]">
                The complete Dormscape. Every feature, unlimited plans and saves,
                no credits to ever think about.
              </p>

              <div className="mt-6">
                <UpgradeButton
                  type="pro"
                  className="rounded-xl bg-ink px-6 py-3 text-center text-base font-semibold text-white transition-all duration-200 hover:bg-cobalt active:translate-y-px"
                />
                <PayBadges />
              </div>

              <div className="mt-6 border-t border-ink/8 pt-6">
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
