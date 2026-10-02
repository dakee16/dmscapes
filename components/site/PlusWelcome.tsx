"use client";

import Modal from "@/components/site/Modal";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { ArrowRight } from "@/components/ds/Icons";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";
import { PLUS_PRICE_USD, PRO_PRICE_USD, PLUS_INITIAL_CREDITS, PRO_INITIAL_CREDITS, RECHARGE_CREDITS, RECHARGE_PRICE_USD } from "@/lib/plan";

// The once-per-session "welcome" upgrade moment, shown after a free user's first
// sign-in of the session (wired in lib/auth-context). Deliberately NOT the
// standard reason-aware UpgradeModal: this is a larger, editorial takeover in
// Plus's own ink and yellow with a real feature grid, meant to feel like a
// considered welcome rather than a paywall. Easy to dismiss; never nags
// again that session.

type Feature = { label: string; desc: string; icon: React.ReactNode };

const FEATURES: Feature[] = [
  {
    label: `${PLUS_INITIAL_CREDITS} plan credits`,
    desc: `Recharge ${RECHARGE_CREDITS} more for $${RECHARGE_PRICE_USD.toFixed(2)}. Saving is always free.`,
    icon: (
      <path
        d="M6 4h12a1 1 0 0 1 1 1v14l-7-4-7 4V5a1 1 0 0 1 1-1z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "PDF and PNG export",
    desc: "Your shopping list or your layout, downloaded.",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Compare designs",
    desc: "Two rooms and their totals, side by side.",
    icon: (
      <>
        <rect x="4" y="5" width="7" height="14" rx="1.5" />
        <rect x="13" y="5" width="7" height="14" rx="1.5" />
      </>
    ),
  },
  {
    label: "Priority requests",
    desc: "Your add-my-school request jumps the line.",
    icon: <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" strokeLinejoin="round" />,
  },
  {
    label: "All 9 vibes",
    desc: "Three free styles, plus Academia, Y2K, Gamer, Team Spirit, Retro, and Pastel.",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 2.2-3.7 2.5 2.5 0 0 1 2.2-3.8H20A2 2 0 0 0 22 12 10 10 0 0 0 12 3z" strokeLinejoin="round" />
        <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

export default function PlusWelcome({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    track("plus_welcome_shown");
    const t = setTimeout(() => ctaRef.current?.focus(), 80);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Modal
      className={d.layer}
      style={{ "--z": 65 } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plus-welcome-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Plus's own colours: an ink card under a strip of tape, yellow accents. */}
      <div className={`ds ${d.sheet} ${d.ink} ${d.taped}`} style={{ "--w": "640px" } as React.CSSProperties}>
        <div className={d.tape} aria-hidden="true" />
        <div className={d.top}>
          <span className={d.badge} data-tone="yellow">
            <b aria-hidden="true">+</b>
            Dormscape Plus
          </span>
          <CloseButton
            onClick={() => {
              track("plus_welcome_dismissed");
              onClose();
            }}
          />
        </div>

        <h2 id="plus-welcome-title" className={d.title}>
          More room <span className={d.serif}>to plan.</span>
        </h2>
        <p className={d.body}>
          Try another style. Compare your favorites. Plus adds {PLUS_INITIAL_CREDITS} plan credits, all nine preset vibes, 2D
          room drawing, and exports. Saving your designs is always free.
        </p>

        <ul className={d.features}>
          {FEATURES.map((f) => (
            <li key={f.label}>
              <span className={d.featureIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
                  {f.icon}
                </svg>
              </span>
              <div>
                <b>{f.label}</b>
                <span>{f.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className={d.priceLine}>
          <strong>${PLUS_PRICE_USD.toFixed(2)}</strong>
          <span>
            one time for Plus. Pro is ${PRO_PRICE_USD.toFixed(2)} for {PRO_INITIAL_CREDITS} plan credits, custom vibes, and 3D
            room building and planning.
          </span>
        </div>

        <div className={d.row}>
          <Link
            ref={ctaRef}
            href="/pricing"
            onClick={() => {
              track("plus_welcome_cta_clicked");
              onClose();
            }}
            className={`${d.btn} ${d.btnYellow}`}
          >
            Unlock Plus <ArrowRight />
          </Link>
          <button
            type="button"
            onClick={() => {
              track("plus_welcome_dismissed");
              onClose();
            }}
            className={d.later}
            style={{ width: "auto", margin: 0 }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
