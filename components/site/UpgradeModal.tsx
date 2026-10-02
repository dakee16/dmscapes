"use client";

import Modal from "@/components/site/Modal";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUpgrade, type UpgradeReason } from "@/lib/upgrade-context";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/checkout";
import { track } from "@/lib/analytics";
import { PLUS_PRICE_USD, PRO_PRICE_USD, RECHARGE_PRICE_USD, RECHARGE_CREDITS, PLUS_INITIAL_CREDITS, PRO_INITIAL_CREDITS } from "@/lib/plan";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { CloseButton, TierBadge } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";

// Headline + one-line hook per gating point. The body below adapts: Plus and Pro
// cards for feature gates and free limits, a Pro card for Pro-only tools, the
// recharge-vs-Pro choice for Plus members out of credits, and the Flex form.
const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  "plan-credits": {
    title: "You're out of plan credits",
    body: "You've used your Plus plan credits. Recharge to generate more rooms. Your saved designs, exports, and comparisons stay right where they are.",
  },
  "workspace": { title: "Make room for your roommates", body: "Pro hosts one shared room with up to four people, including you. Friends join free to edit or comment, with a shared shopping list and version history. Personal rooms stay available on every plan." },
  "pro-credits": {
    title: "You're out of plan credits",
    body: "Add more for $0.99 per credit. Your saved rooms and Pro tools, including 3D building and planning, remain available.",
  },
  "save-credits": {
    title: "Your designs stay saved",
    body: "Saving is always free and unlimited. Recharge when you need more room plans; everything you've saved stays right where it is.",
  },
  "free-plan-limit": {
    title: "That's your free room plan",
    body: `Free includes one room plan. Plus adds ${PLUS_INITIAL_CREDITS} plan credits and Plus tools. Pro includes ${PRO_INITIAL_CREDITS} plan credits, 3D tools, and custom vibes. Saving is always free.`,
  },
  "flex-credits": {
    title: "You're out of credits",
    body: `Buy more plan credits for $0.99 each. Or upgrade to Pro for ${PRO_INITIAL_CREDITS} included credits and every premium tool. No subscription.`,
  },
  "free-save-limit": {
    title: "Keep every good idea",
    body: `Saving is always free. Plus adds ${PLUS_INITIAL_CREDITS} plan credits, all nine preset vibes, and Plus tools. Pro includes ${PRO_INITIAL_CREDITS} plan credits, 3D tools, and custom vibes.`,
  },
  pdf: {
    title: "Export your list as a PDF",
    body: "PDF export is a paid perk. Hand a clean, printable shopping list to whoever's funding the mini fridge.",
  },
  png: {
    title: "Save your room as an image",
    body: "PNG export is a paid perk. Download your layout to drop into a doc or the group chat.",
  },
  compare: {
    title: "See two designs side by side",
    body: "The comparison view is a paid perk. Line up two rooms and their totals before you commit to one.",
  },
  "school-request": {
    title: "Skip to the front of the line",
    body: "Priority school requests are a paid perk. Upgrade and we'll bump yours up the queue.",
  },
  style: {
    title: "That's a paid vibe",
    body: "Academia, Y2K Cyber, Gamer, Team Spirit, Retro, and Pastel are paid vibes. Plus and Pro unlock all nine.",
  },
  "custom-vibe": {
    title: "Create your own vibe with Pro",
    body: "Describe any aesthetic in your own words and we'll live-match real products to it. Creating your own vibe is a Pro feature. Pro also includes every curated vibe and premium tool.",
  },
  "own-item": {
    title: "Add your own products",
    body: "Paste any Amazon link to drop your own products straight into your room, budget, and layout. Adding your own items is a Plus feature, Plus and Pro both include it, along with every vibe and premium tool.",
  },
  "room-3d": {
    title: "Step inside your room with Pro",
    body: "Arrange furniture in live 3D, try finishes and lighting, and switch to the same layout in 2D. 3D Room Studio is included with Pro. Your 2D plan stays available.",
  },
  "draw-3d": {
    title: "Build your own room in 3D",
    body: "Place a floor, draw custom walls, and add doors and windows on a 3D grid. Then furnish that same room in the 3D planner. The 3D Room Builder is included with Pro. Plus keeps the 2D drawing tool.",
  },
  "draw-room": {
    title: "Draw your own room",
    body: "Sketch your floor plan in 2D, including walls, doors, windows, and closets, then get a layout built around it. Plus and Pro both include 2D drawing, all preset vibes, and Plus tools. Building and planning directly in 3D require Pro.",
  },
  generic: {
    title: "Do more with Dormscape Plus",
    body: "Unlock all nine preset vibes, more room plans, exports, and comparison. Pro adds the 3D Room Builder, live 3D planning, and custom vibes.",
  },
};


const PERKS = [
  `${PLUS_INITIAL_CREDITS} plan credits (saving is always free)`,
  "All 9 vibes unlocked",
  "Draw your own room, any shape",
  "PDF and PNG export",
  "Compare two designs side by side",
  "Priority on add-my-school requests",
];
const PRO_PERKS = [
  "Everything in Plus",
  `${PRO_INITIAL_CREDITS} plan credits`,
  "3D Room Builder",
  "Live 3D Room Studio",
  "Create your own vibe",
  "A shared room for your people",
];
const PRO_LINE = `${PRO_INITIAL_CREDITS} plan credits, 3D tools, and custom vibes.`;
const PRO_GATES: UpgradeReason[] = ["workspace", "room-3d", "draw-3d", "custom-vibe"];
const usd = (n: number) => `$${n.toFixed(2)}`;

export default function UpgradeModal() {
  const { open, reason, closeUpgrade } = useUpgrade();
  const { openAuthModal } = useAuth();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const rechargeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<null | "recharge" | "pro" | "plus">(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    track("upgrade_prompt_shown", { reason });
    setBusy(null);
    setError("");
    const recharge = reason === "plan-credits" || reason === "save-credits";
    const t = setTimeout(
      () => (recharge ? rechargeRef : ctaRef).current?.focus(),
      60
    );
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeUpgrade();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, reason, closeUpgrade]);

  if (!open) return null;
  const copy = COPY[reason];
  // Plus members who ran a counter dry get the recharge-vs-Pro layout; Pro-only
  // tools get the Pro card; a Flex or Pro member out of credits gets the
  // à-la-carte buy form; every other gate gets the Plus and Pro cards.
  const isRecharge = reason === "plan-credits" || reason === "save-credits";
  const isFlexCredits = reason === "flex-credits" || reason === "pro-credits";
  const isProGate = PRO_GATES.includes(reason);
  const isPlans = !isRecharge && !isFlexCredits && !isProGate;
  const proBadge = isProGate || reason === "pro-credits";

  async function buy(type: "recharge" | "pro" | "plus") {
    if (busy) return;
    setBusy(type);
    setError("");
    track("upgrade_cta_clicked", { reason, type });
    const res = await startCheckout(type);
    if (res.ok) return; // browser navigates to Stripe
    setBusy(null);
    if (res.needsAuth) {
      closeUpgrade();
      openAuthModal("profile");
      return;
    }
    setError(res.error);
  }

  const errorLine = error && (
    <p className={d.error} role="alert">
      {error}
    </p>
  );

  return (
    <Modal
      className={`${d.layer} ${d.bottom}`}
      style={{ "--z": 90 } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeUpgrade();
      }}
    >
      <div
        className={`ds ${d.sheet} ${reason === "room-3d" ? d.still : ""}`}
        style={{ "--w": isPlans ? "740px" : "540px" } as React.CSSProperties}
      >
        <div className={d.top}>
          <TierBadge tier={proBadge ? "pro" : "plus"} />
          <CloseButton onClick={closeUpgrade} />
        </div>

        <h2 id="upgrade-modal-title" className={d.title}>
          {copy.title}
        </h2>
        <p className={d.body}>{copy.body}</p>

        {isProGate ? (
          // Pro-only tools: one Pro card, like the Pro column on /pricing.
          <>
            <div className={`${d.plan} ${d.planPro}`} style={{ marginTop: 22 }}>
              <div className={d.planHead}>
                <h3>Pro</h3>
                <span className={d.planTag}>One time</span>
              </div>
              <p className={d.priceRow}>
                <span className={d.price}>{usd(PRO_PRICE_USD)}</span>
                <span className={d.once}>once</span>
              </p>
              <p className={d.planLine}>
                3D Room Builder, live 3D Room Studio, create your own vibe, {PRO_INITIAL_CREDITS} plan credits, shared room
                hosting, and everything in Plus.
              </p>
              <div className={d.planCta}>
                <button ref={ctaRef} type="button" className={`${d.btn} ${d.btnWhite} ${d.wide}`} onClick={() => buy("pro")} disabled={busy !== null}>
                  {busy ? "Starting checkout…" : `Get Pro for ${usd(PRO_PRICE_USD)} once`}
                </button>
              </div>
            </div>
            {errorLine}
            <div className={d.foot}>
              <Link href="/pricing#pro" onClick={closeUpgrade} className={d.textLink}>
                See all Pro features <ArrowRight size={16} />
              </Link>
              <button type="button" className={d.later} onClick={closeUpgrade}>
                Keep my current plan
              </button>
            </div>
          </>
        ) : isFlexCredits ? (
          // Out of credits on Flex or Pro: buy more à la carte, or step up to Pro.
          <>
            <div className={d.well}>
              <BuyCreditsForm source="upgrade-modal" autoFocus onStarted={closeUpgrade} />
            </div>
            {reason !== "pro-credits" && (
              <div className={d.options} style={{ marginTop: 12 }}>
                <button type="button" onClick={() => buy("pro")} disabled={busy !== null} className={`${d.option} ${d.optionBlue}`}>
                  <span className={d.optionText}>
                    <b>{busy === "pro" ? "Starting checkout…" : "Upgrade to Pro"}</b>
                    <span>{PRO_LINE}</span>
                  </span>
                  <span className={d.optionPrice}>{usd(PRO_PRICE_USD)}</span>
                </button>
              </div>
            )}
            {errorLine}
            <button type="button" onClick={closeUpgrade} className={d.later}>
              Not now
            </button>
          </>
        ) : isRecharge ? (
          // Out of a counter: a Plus member chooses between a recharge and Pro.
          <>
            <div className={d.options}>
              <button
                ref={rechargeRef}
                type="button"
                onClick={() => buy("recharge")}
                disabled={busy !== null}
                className={`${d.option} ${d.optionInk}`}
              >
                <span className={d.optionText}>
                  <b>{busy === "recharge" ? "Starting checkout…" : `Recharge ${RECHARGE_CREDITS} plan credits`}</b>
                  <span>{RECHARGE_CREDITS} more rooms to design, added on.</span>
                </span>
                <span className={d.optionPrice}>{usd(RECHARGE_PRICE_USD)}</span>
              </button>
              <button type="button" onClick={() => buy("pro")} disabled={busy !== null} className={`${d.option} ${d.optionBlue}`}>
                <span className={d.optionText}>
                  <b>{busy === "pro" ? "Starting checkout…" : "Upgrade to Pro"}</b>
                  <span>{PRO_LINE}</span>
                </span>
                <span className={d.optionPrice}>{usd(PRO_PRICE_USD)}</span>
              </button>
            </div>
            {errorLine}
            <button type="button" onClick={closeUpgrade} className={d.later}>
              Not now
            </button>
          </>
        ) : (
          // Free-user gate: the Plus and Pro cards from /pricing, side by side.
          <>
            <div className={d.plans}>
              <article className={`${d.plan} ${d.planPlus}`} aria-labelledby="upgrade-plus">
                <div className={d.planHead}>
                  <h3 id="upgrade-plus">
                    Plus<span>+</span>
                  </h3>
                  <span className={d.planTag}>One time</span>
                </div>
                <p className={d.priceRow}>
                  <span className={d.price}>{usd(PLUS_PRICE_USD)}</span>
                  <span className={d.once}>once</span>
                </p>
                <ul className={d.perks}>
                  {PERKS.map((perk) => (
                    <li key={perk}>
                      <Check size={16} color="var(--ds-yellow)" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className={d.planCta}>
                  <button ref={ctaRef} type="button" className={`${d.btn} ${d.btnYellow} ${d.wide}`} onClick={() => buy("plus")} disabled={busy !== null}>
                    {busy === "plus" ? "Starting checkout…" : `Get Plus for ${usd(PLUS_PRICE_USD)}`}
                  </button>
                </div>
              </article>
              <article className={`${d.plan} ${d.planPro}`} aria-labelledby="upgrade-pro">
                <div className={d.planHead}>
                  <h3 id="upgrade-pro">Pro</h3>
                  <span className={d.planTag}>{PRO_INITIAL_CREDITS} credits</span>
                </div>
                <p className={d.priceRow}>
                  <span className={d.price}>{usd(PRO_PRICE_USD)}</span>
                  <span className={d.once}>once</span>
                </p>
                <ul className={d.perks}>
                  {PRO_PERKS.map((perk) => (
                    <li key={perk}>
                      <Check size={16} color="#fff" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className={d.planCta}>
                  <button type="button" className={`${d.btn} ${d.btnWhite} ${d.wide}`} onClick={() => buy("pro")} disabled={busy !== null}>
                    {busy === "pro" ? "Starting checkout…" : `Go Pro for ${usd(PRO_PRICE_USD)}`}
                  </button>
                </div>
              </article>
            </div>
            {errorLine}
            <div className={d.foot}>
              <Link
                href="/pricing"
                onClick={() => {
                  track("upgrade_cta_clicked", { reason });
                  closeUpgrade();
                }}
                className={d.textLink}
              >
                Compare every plan <ArrowRight size={16} />
              </Link>
              <button type="button" onClick={closeUpgrade} className={d.later}>
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
