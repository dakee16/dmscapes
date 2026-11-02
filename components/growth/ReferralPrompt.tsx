"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Modal from "@/components/site/Modal";
import { ArrowRight } from "@/components/ds/Icons";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";
import { REVEAL_EASE } from "@/components/site/Reveal";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { hasInvite } from "@/lib/invites";
import { REFERRAL_BONUS_DESIGNS, REFERRAL_MONTHLY_CAP } from "@/lib/plan";
import InviteLink from "./InviteLink";

const MotionModal = motion.create(Modal);

// "Give a friend a free design, get one too": shown once a visitor has been on the
// site for 20 seconds, then at most once every 30 days per browser. It waits while
// another dialog is open, the tab is hidden, or the page is one where it would
// interrupt (sign-in, the planner steps, a live room, checkout returns, legal text).
const SHOWN_KEY = "dormscape-invite-prompt";
const AFTER_AUTH_KEY = "dormscape-invite-after-auth";
const AFTER_MS = 20_000;
const REPEAT_MS = 30 * 24 * 60 * 60 * 1000;
const QUIET = /^\/(login|reset-password|thank-you|privacy|terms|cookies|report|dev|rooms\/[^/]+)(\/|$)|^\/plan(\/(?!result)|$)/;

type Variant = "invite" | "join" | "invited";
const each = `${REFERRAL_BONUS_DESIGNS} free design${REFERRAL_BONUS_DESIGNS === 1 ? "" : "s"} each`;

export default function ReferralPrompt() {
  const { user, loading, openAuthModal } = useAuth();
  const [variant, setVariant] = useState<Variant | null>(null);
  const reduce = useReducedMotion();
  const signedIn = Boolean(user);
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  useEffect(() => {
    if (loading) return;
    // Signed up from this prompt's "Get my invite link": show the link right away.
    let afterAuth = false;
    try {
      afterAuth = signedIn && window.sessionStorage.getItem(AFTER_AUTH_KEY) === "1";
      if (afterAuth) window.sessionStorage.removeItem(AFTER_AUTH_KEY);
      // No storage means no memory of having shown it: stay quiet rather than show it on every visit.
      if (!afterAuth && Date.now() - Number(window.localStorage.getItem(SHOWN_KEY) ?? 0) < REPEAT_MS) return;
    } catch {
      return;
    }
    let timer = 0;
    const attempt = () => {
      const busy =
        document.visibilityState !== "visible" ||
        QUIET.test(window.location.pathname) ||
        // Modal dialogs only: the cookie banner is a non-modal dialog and may never be answered.
        document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]');
      if (busy) {
        timer = window.setTimeout(attempt, 4000);
        return;
      }
      try {
        window.localStorage.setItem(SHOWN_KEY, String(Date.now()));
      } catch {
        // Shown anyway; the check above already passed.
      }
      const v: Variant = signedInRef.current ? "invite" : hasInvite() ? "invited" : "join";
      setVariant(v);
      track("referral_prompt_shown", { variant: v });
    };
    timer = window.setTimeout(attempt, afterAuth ? 1500 : AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [loading, signedIn]);

  useEffect(() => {
    if (!variant) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function dismiss() {
    track("referral_prompt_dismissed", { variant });
    setVariant(null);
  }

  function signUp() {
    track("referral_prompt_cta", { variant });
    if (variant === "join") {
      try {
        window.sessionStorage.setItem(AFTER_AUTH_KEY, "1");
      } catch {
        // They can still find the link in Billing.
      }
    }
    setVariant(null);
    openAuthModal("profile");
  }

  return (
    <AnimatePresence>
      {variant && (
        <MotionModal
          className={`${d.layer} ${d.quiet}`}
          style={{ "--z": 64 } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: REVEAL_EASE }}
        >
          <motion.div
            className={`ds ${d.sheet} ${d.quiet}`}
            style={{ "--w": "500px" } as React.CSSProperties}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.34, ease: REVEAL_EASE }}
          >
            <div className={d.top}>
              <span className={d.mark} aria-hidden="true">
                dormscape<i />
              </span>
              <CloseButton onClick={dismiss} />
            </div>

            <h2 id="invite-title" className={d.title}>
              {variant === "invited" ? (
                <>
                  A friend invited you to <span className={d.serif}>dormscape.</span>
                </>
              ) : (
                <>
                  Give a friend a free design. <span className={d.serif}>Get one too.</span>
                </>
              )}
            </h2>
            <p className={d.body}>
              {variant === "invite"
                ? "Send your link to a friend or roommate. When they make their first design, you each get a free design."
                : variant === "join"
                  ? "Make a free account to get your invite link. When a friend you invite makes their first design, you each get a free design."
                  : "Sign up free and make your first design. Then you and the friend who invited you each get a free design."}
            </p>

            <div className={d.coinRow}>
              <span className={d.coin} aria-hidden="true">
                +{REFERRAL_BONUS_DESIGNS}
              </span>
              <div>
                <b>{each}</b>
                <span>
                  {variant === "invited"
                    ? "For you and your friend, after your first design."
                    : "For you and your friend, once they make their first design."}
                </span>
              </div>
            </div>

            {variant === "invite" ? (
              <>
                <InviteLink from="prompt" />
                <p className={d.small}>Up to {REFERRAL_MONTHLY_CAP} free designs a month from your invites.</p>
              </>
            ) : (
              <div className={d.row}>
                <button type="button" onClick={signUp} className={`${d.btn} ${d.btnInk}`}>
                  {variant === "invited" ? "Sign up free" : "Get my invite link"} <ArrowRight />
                </button>
                <button type="button" onClick={dismiss} className={d.later} style={{ width: "auto", margin: 0 }}>
                  Maybe later
                </button>
              </div>
            )}
          </motion.div>
        </MotionModal>
      )}
    </AnimatePresence>
  );
}
