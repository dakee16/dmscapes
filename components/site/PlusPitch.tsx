"use client";

import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import PlanCta from "@/components/site/PlanCta";
import { useAuth } from "@/lib/auth-context";
import { isPaid, isPro } from "@/lib/plan";

// Homepage Plus section. Free and logged-out visitors get the upsell pitch
// (PlusUpsell). Paying customers get a celebratory status banner instead
// (SubscriberBanner): pitching Plus to someone who already bought it reads as
// tone-deaf, so we confirm their tier and thank them for it.
export default function PlusPitch() {
  const { profile } = useAuth();
  if (isPaid(profile)) {
    return <SubscriberBanner tier={isPro(profile) ? "pro" : "plus"} />;
  }
  return <PlusUpsell />;
}

// ---- Subscriber banner (Plus / Pro) --------------------------------------

const PERKS: Record<"plus" | "pro", string[]> = {
  plus: [
    "All 9 vibes",
    "PDF + PNG export",
    "Compare two rooms",
    "Priority school requests",
  ],
  pro: [
    "Unlimited plans + saves",
    "Create your own vibe",
    "All 9 vibes",
    "PDF + PNG export",
    "Priority school requests",
  ],
};

function SubscriberBanner({ tier }: { tier: "plus" | "pro" }) {
  const label = tier === "pro" ? "Pro" : "Plus";
  const blurb =
    tier === "pro"
      ? "Unlimited plans and saves, every vibe, every feature. The whole studio is yours, for good."
      : "Every vibe and every premium feature is yours, permanently. Here's to the rooms you'll design.";

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
      <div className="relative overflow-hidden rounded-2xl border border-cobalt/25 bg-card p-8 shadow-[0_30px_80px_-40px_rgba(43,78,255,0.5)] sm:p-12">
        {/* Layered celebratory backdrop: brand grid, a cobalt->highlight wash,
            and two soft glows. */}
        <div className="grid-paper absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-cobalt/[0.08] via-transparent to-highlight/25"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-highlight/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-cobalt/15 blur-3xl"
          aria-hidden="true"
        />
        {/* The celebratory flourish: a single translucent sheen that sweeps
            across the card. Clipped by overflow-hidden above. */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="sheen-band absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        </div>

        {/* One coordinated reveal: badge -> heading -> chips -> CTA cascade in
            together, only when the section scrolls into view (Reveal stagger),
            so it reads as a single reward moment instead of pieces animating on
            mount off-screen. */}
        <Reveal stagger className="relative">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cobalt/30 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber" fill="currentColor" aria-hidden="true">
                <path d="M2.8 7.4l4 3 4.4-6a1 1 0 0 1 1.6 0l4.4 6 4-3a1 1 0 0 1 1.57 1l-1.6 8.9a1 1 0 0 1-1 .82H4.83a1 1 0 0 1-1-.82L2.24 8.4a1 1 0 0 1 1.56-1z" />
              </svg>
              Member · Dormscape {label}
            </span>
          </div>
          <div className="mt-4 max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              You&rsquo;re on <span className="hl">{label}.</span>
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">{blurb}</p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2.5">
            {PERKS[tier].map((perk) => (
              <li
                key={perk}
                className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper/70 px-3.5 py-2 text-sm font-medium text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <PlanCta className="inline-flex h-14 items-center rounded-xl bg-cobalt px-7 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep" />
            <Link
              href="/account"
              className="font-mono text-xs uppercase tracking-wide text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Manage plan
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---- Plus upsell (free / logged-out) -------------------------------------

// Deliberately warm/light (highlight + paper), so it reads distinct from the
// ink and cobalt CTA blocks elsewhere on the page.
const MOMENTS: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Two rooms, one call",
    body: "Save both, put them side by side, and let the totals settle it.",
    icon: (
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4m6-16h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M12 3v18" />
    ),
  },
  {
    title: "A list they can read",
    body: "Export the whole cart as a tidy PDF for whoever's holding the card.",
    icon: (
      <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6H8zm5 0v5h5M9 13h6M9 17h6" />
    ),
  },
  {
    title: "Cut the school line",
    body: "Your add-my-school request jumps straight to the front of the queue.",
    icon: <path d="M13 5l7 7-7 7M4 5l7 7-7 7" />,
  },
  {
    title: "Four looks, Plus-only",
    body: "Gamer, Team Spirit, Retro, and Pastel come with Plus, each a full room in its own palette.",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  },
];

function PlusUpsell() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-ink/12 bg-card p-8 sm:p-12">
          <div className="grid-paper absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-highlight/30 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
              <span className="font-display text-sm font-extrabold leading-none">+</span>
              Dormscape Plus
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              You&rsquo;ll have more than one good idea.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              The cozy version and the bold one. Free gets you one plan and one
              save to try it; Plus is five of each, plus lining two rooms up side
              by side, exporting the winner, and designing in all nine vibes
              instead of five.
            </p>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MOMENTS.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-ink/10 bg-paper/60 p-5"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-lg bg-highlight text-ink"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {m.icon}
                  </svg>
                </span>
                <h3 className="mt-3 font-display text-base font-bold tracking-tight">
                  {m.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.body}</p>
              </div>
            ))}
          </div>

          {/* Pro-exclusive highlight: describe your own vibe. */}
          <div className="relative mt-4 flex flex-col items-start gap-2 rounded-xl border border-cobalt/25 bg-cobalt/[0.05] px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cobalt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
              Pro only
            </span>
            <p className="text-sm leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Create your own vibe:</span> skip the
              presets and describe any aesthetic in your own words. We live-match real
              products to it.
            </p>
          </div>

          <div className="relative mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/pricing"
              className="inline-flex h-14 items-center rounded-xl bg-ink px-7 text-base font-semibold text-white transition-colors hover:bg-cobalt"
            >
              See plans
            </Link>
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              $4.99 for Plus · $14.99 for Pro · one time
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
