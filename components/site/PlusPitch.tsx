"use client";

import Link from "next/link";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { useAuth } from "@/lib/auth-context";
import { isPaid, isPro, PLUS_INITIAL_CREDITS, PRO_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_PRICE_USD } from "@/lib/plan";
import css from "@/components/account-ui/PlusPitch.module.css";

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
    `${PLUS_INITIAL_CREDITS} included plan credits`,
    "All 9 vibes",
    "Draw your own room",
    "PDF + PNG export",
    "Compare two rooms",
    "Priority school requests",
  ],
  pro: [
    `${PRO_INITIAL_CREDITS} included plan credits`,
    "3D Room Builder",
    "Live 3D Room Studio",
    "Shared room: invite up to three friends",
    "Create your own vibe",
    "Draw your own room",
    "All 9 vibes",
    "PDF + PNG export",
    "Priority school requests",
  ],
};

function SubscriberBanner({ tier }: { tier: "plus" | "pro" }) {
  const label = tier === "pro" ? "Pro" : "Plus";
  const blurb =
    tier === "pro"
      ? "Your Pro tools are unlocked: 3D room building, live 3D planning, shared room hosting, and custom vibes. Top up plan credits whenever you need more."
      : "All nine preset vibes and your Plus tools are yours, permanently. Pro adds 3D room building, live 3D planning, shared room hosting, and custom vibes. Here's to the rooms you'll design.";

  return (
    <section className={`ds-wrap ${css.section}`} aria-labelledby="plus-pitch-member">
      <div className={`${css.card} ${css.member}`} data-tier={tier} data-reveal="">
        <span className={css.badge}>Member · Dormscape {label}</span>
        <h2 id="plus-pitch-member" className={css.title}>
          You&rsquo;re on <span className={css.serif}>{label}.</span>
        </h2>
        <p className={css.lede}>{blurb}</p>
        <ul className={css.chips}>
          {PERKS[tier].map((perk) => (
            <li key={perk}>
              <Check size={16} />
              {perk}
            </li>
          ))}
        </ul>
        <div className={css.actions}>
          <PlanCta className="ds-btn ds-btn--yellow" />
          <Link href="/account" className={css.manage}>
            Manage plan
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---- Plus upsell (free / logged-out) -------------------------------------

// Plus's ink and yellow, with Pro's blue for the Pro-only strip.
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
    title: "Six more ways to make it yours",
    body: "Academia, Y2K, Gamer, Team Spirit, Retro, and Pastel come with Plus, each a full room in its own palette.",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  },
];

function PlusUpsell() {
  return (
    <section className={`ds-wrap ${css.section}`} aria-labelledby="plus-pitch-upsell">
      <div className={css.card} data-reveal="">
        <span className={css.badge}>
          <b aria-hidden="true">+</b> Dormscape Plus
        </span>
        <h2 id="plus-pitch-upsell" className={css.title}>
          You&rsquo;ll have more than <span className={css.serif}>one good idea.</span>
        </h2>
        <p className={css.lede}>
          The cozy version and the bold one. Free gets you one room plan; Plus adds {PLUS_INITIAL_CREDITS} more, plus comparing
          two rooms side by side, exporting the winner, and designing in all nine preset vibes. Saving your designs is always
          free.
        </p>

        <div className={css.moments} data-stagger="">
          {MOMENTS.map((m) => (
            <div key={m.title} className={css.moment} data-reveal="">
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {m.icon}
                </svg>
              </span>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </div>
          ))}
        </div>

        <p className={css.strip}>
          <span className={css.tag}>Plus</span>
          <span>
            <strong>Draw your own room:</strong> not on our list, or an unusual shape? Sketch your floor plan in 2D, add doors
            and windows, and start planning a space that feels like yours.
          </span>
        </p>
        <p className={css.strip} data-tone="pro">
          <span className={css.tag}>Pro only</span>
          <span>
            <strong>Create your own vibe:</strong> skip the presets and describe your aesthetic in your own words. We match real
            products to it. Pro also includes live 3D planning and the{" "}
            <Link href="/plan/draw/3d" className="ds-link">
              3D Room Builder
            </Link>
            .
          </span>
        </p>

        <div className={css.actions}>
          <Link href="/pricing" className="ds-btn ds-btn--yellow">
            See plans <ArrowRight />
          </Link>
          <span className={css.prices}>
            ${PLUS_PRICE_USD.toFixed(2)} for Plus · ${PRO_PRICE_USD.toFixed(2)} for Pro · one time
          </span>
        </div>
      </div>
    </section>
  );
}
