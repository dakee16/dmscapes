"use client";

import Modal from "@/components/site/Modal";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";
import { PRO_PRICE_USD, PLUS_INITIAL_CREDITS, PRO_INITIAL_CREDITS } from "@/lib/plan";

// Brief, satisfying confirmation shown when a buyer returns from Stripe Checkout
// for Plus or Pro. Stripe redirects to /account?upgraded=plus|pro (see
// app/api/checkout/route.ts), so this reads that param, celebrates once, and
// strips it from the URL so a refresh won't replay it. Distinct from the
// affiliate PurchaseSurvey: this confirms the plan purchase itself, and is a
// read-only "you're all set", never a form.
type Tier = "plus" | "pro";

const COPY: Record<Tier, { title: string; blurb: string; perks: string[] }> = {
  plus: {
    title: "You're on Plus.",
    blurb: "Every preset vibe and your Plus tools are unlocked, permanently.",
    perks: [
      `${PLUS_INITIAL_CREDITS} included plan credits, with free saving`,
      "All 9 vibes unlocked",
      "PDF + PNG export and side-by-side compare",
      "Priority on your add-my-school requests",
    ],
  },
  pro: {
    title: "You're on Pro.",
    blurb: "Your Pro tools are unlocked. Generate rooms with your plan credits, then keep editing and saving for free.",
    perks: [
      `${PRO_INITIAL_CREDITS} included plan credits, with free saving`,
      "3D Room Builder and live 3D Room Studio",
      "Host one shared room with up to four people",
      "Create your own vibe",
      "All 9 vibes unlocked",
      "PDF + PNG export and side-by-side compare",
      "Priority on your add-my-school requests",
    ],
  },
};

export default function PurchaseThankYou() {
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    if (upgraded !== "plus" && upgraded !== "pro") return;
    setTier(upgraded);
    track("purchase_thank_you_shown", { tier: upgraded });
    // Strip the param so a refresh or share doesn't replay the celebration.
    params.delete("upgraded");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    );
  }, []);

  useEffect(() => {
    if (!tier) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTier(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tier]);

  if (!tier) return null;
  const copy = COPY[tier];

  function close() {
    track("purchase_thank_you_dismissed", { tier });
    setTier(null);
  }

  return (
    <Modal
      className={d.layer}
      style={{ "--z": 65 } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="thankyou-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={`ds ${d.sheet} ${d.taped}`} style={{ "--w": "500px", paddingTop: "calc(clamp(24px, 3vw, 34px) + 12px)" } as React.CSSProperties}>
        <div className={d.tape} data-tone={tier === "pro" ? "blue" : undefined} aria-hidden="true" />
        <div className={d.top}>
          <span className={d.seal} data-tone={tier} aria-hidden="true">
            <Check size={30} strokeWidth={3} />
          </span>
          <CloseButton onClick={close} />
        </div>

        <h2 id="thankyou-title" className={d.title}>
          Thank you. <span className={d.serif}>{copy.title}</span>
        </h2>
        <p className={d.body}>{copy.blurb}</p>

        <ul className={d.perks}>
          {copy.perks.map((perk) => (
            <li key={perk}>
              <Check size={18} color="var(--ds-blue)" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {tier === "plus" && (
          <p className={d.small}>
            Pro includes {PRO_INITIAL_CREDITS} plan credits and 3D tools for ${PRO_PRICE_USD.toFixed(2)}, one time.
          </p>
        )}

        <button type="button" onClick={close} className={`${d.btn} ${tier === "pro" ? d.btnBlue : d.btnInk} ${d.wide}`} style={{ marginTop: 26 }}>
          Start designing <ArrowRight />
        </button>
      </div>
    </Modal>
  );
}
