"use client";

import Modal from "@/components/site/Modal";
import { ArrowRight } from "@/components/ds/Icons";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPaid } from "@/lib/plan";
import { track } from "@/lib/analytics";
import { cameFromHallFinder } from "@/lib/hall-finder";

// The "start here" welcome for a brand-new account: a warm, once-ever hello that
// hands the student their one free design credit. Deliberately NOT the Plus
// upsell (PlusWelcome) or the reason-aware UpgradeModal; this is the friendly
// front door, shown before any paywall. It surfaces only for a free account
// that hasn't spent its free plan yet (free_plans_used === 0), and is suppressed
// permanently per account once seen (localStorage keyed by user id).
const seenKey = (uid: string) => `dormscape-signup-welcome-${uid}`;

export default function SignupWelcome() {
  const { user, profile, modalOpen, setSignupWelcomeOpen } = useAuth();
  const [open, setOpen] = useState(false);

  // Publish open state so the post-signup username prompt can wait until this
  // welcome is dismissed, sequencing the two instead of stacking them (Part 3).
  useEffect(() => {
    setSignupWelcomeOpen(open);
    return () => setSignupWelcomeOpen(false);
  }, [open, setSignupWelcomeOpen]);

  // Reveal once the account is known, the auth modal has closed (so it never
  // stacks on the login / username step), and this is a genuinely fresh free
  // account. localStorage is written the moment it shows, so a dismiss-by-
  // navigation still counts as "seen".
  useEffect(() => {
    if (open || !user || !profile || modalOpen) return;
    if (isPaid(profile)) return; // the free credit only means something on free
    if ((profile.free_plans_used ?? 0) !== 0) return; // already started designing
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(seenKey(user.id))) return;
    window.localStorage.setItem(seenKey(user.id), "1");
    // Signing up from Hall Finder's gate lands back on the ranked halls: no design pitch over them.
    if (cameFromHallFinder()) return;
    setOpen(true);
    track("signup_welcome_shown");
  }, [open, user, profile, modalOpen]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    track("signup_welcome_dismissed");
    setOpen(false);
  }

  return (
    <>
      {open && (
        <Modal
          className={`${d.layer} ${d.quiet}`}
          style={{ "--z": 65 } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-welcome-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <div className={`ds ${d.sheet} ${d.quiet}`} style={{ "--w": "480px" } as React.CSSProperties}>
            <div className={d.top}>
              <span className={d.mark} aria-hidden="true">
                dormscape<i />
              </span>
              <CloseButton onClick={dismiss} />
            </div>

            <h2 id="signup-welcome-title" className={d.title}>
              Welcome to <span className={d.serif}>dormscape.</span>
            </h2>
            <p className={d.body}>
              Here&rsquo;s your first design credit, on us. Pick your school, choose a vibe, and start imagining your space
              with a room layout and shoppable picks for your budget.
            </p>

            {/* The credit, front and center. */}
            <div className={d.coinRow}>
              <span className={d.coin} aria-hidden="true">
                1
              </span>
              <div>
                <b>1 free design credit</b>
                <span>Enough to plan a full room, start to finish. No card needed.</span>
              </div>
            </div>

            <div className={d.row}>
              <Link
                href="/plan"
                onClick={() => {
                  track("signup_welcome_cta_clicked");
                  setOpen(false);
                }}
                className={`${d.btn} ${d.btnInk}`}
              >
                Plan my room <ArrowRight />
              </Link>
              <button type="button" onClick={dismiss} className={d.later} style={{ width: "auto", margin: 0 }}>
                Maybe later
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
