"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Modal from "@/components/site/Modal";
import { ArrowRight } from "@/components/ds/Icons";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { hasInvite } from "@/lib/invites";
import { REFERRAL_BONUS_DESIGNS, REFERRAL_MONTHLY_CAP } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import InviteLink from "./InviteLink";

// "Give a friend a free design, get one too": shown 20 seconds after the person
// finishes a design (design_completed, see designCompleted below), and never again
// once it has appeared: remembered in this browser and, when signed in, on the
// account (user metadata) so another device stays quiet too. It waits while
// another dialog is open, the tab is hidden, or the page is one where it would
// interrupt (sign-in, the planner steps, a live room, checkout returns, legal text).
const SHOWN_KEY = "dormscape-invite-prompt";
const SHOWN_META = "referral_prompt_shown";
const AFTER_AUTH_KEY = "dormscape-invite-after-auth";
const AFTER_MS = 20_000;
const QUIET = /^\/(login|reset-password|thank-you|privacy|terms|cookies|report|dev|rooms\/[^/]+)(\/|$)|^\/plan(\/(?!result)|$)/;

// Called by the plan result where it tracks design_completed; until then the prompt stays away.
const DESIGN_EVENT = "dormscape:design-completed";
let designDone = false;
export function designCompleted() {
  designDone = true;
  window.dispatchEvent(new Event(DESIGN_EVENT));
}
function onDesign(cb: () => void) {
  window.addEventListener(DESIGN_EVENT, cb);
  return () => window.removeEventListener(DESIGN_EVENT, cb);
}

type Variant = "invite" | "join" | "invited";
const each = `${REFERRAL_BONUS_DESIGNS} free design${REFERRAL_BONUS_DESIGNS === 1 ? "" : "s"} each`;

export default function ReferralPrompt() {
  const { user, loading, openAuthModal } = useAuth();
  const [variant, setVariant] = useState<Variant | null>(null);
  const designed = useSyncExternalStore(onDesign, () => designDone, () => false);
  const signedIn = Boolean(user);
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const shownOnAccount = Boolean(user?.user_metadata?.[SHOWN_META]);

  useEffect(() => {
    if (loading) return;
    // Signed up from this prompt's "Get my invite link": show the link right away.
    // The flag is cleared only when the link shows, so a re-run of this effect can't lose it.
    let afterAuth = false;
    try {
      afterAuth = signedIn && window.sessionStorage.getItem(AFTER_AUTH_KEY) === "1";
      // Only after a finished design, and once per person. No storage means no memory
      // of having shown it: stay quiet rather than risk showing it again.
      if (!afterAuth && (!designed || shownOnAccount || window.localStorage.getItem(SHOWN_KEY) !== null)) return;
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
        window.sessionStorage.removeItem(AFTER_AUTH_KEY);
      } catch {
        // Shown anyway; the check above already passed.
      }
      if (signedInRef.current) void getBrowserClient()?.auth.updateUser({ data: { [SHOWN_META]: true } });
      const v: Variant = signedInRef.current ? "invite" : hasInvite() ? "invited" : "join";
      setVariant(v);
      track("referral_prompt_shown", { variant: v });
    };
    timer = window.setTimeout(attempt, afterAuth ? 1500 : AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [loading, signedIn, designed, shownOnAccount]);

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
    <>
      {variant && (
        <Modal
          className={`${d.layer} ${d.quiet}`}
          style={{ "--z": 64 } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <div className={`ds ${d.sheet} ${d.quiet}`} style={{ "--w": "500px" } as React.CSSProperties}>
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
          </div>
        </Modal>
      )}
    </>
  );
}
