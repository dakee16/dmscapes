"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  analyticsAllowed,
  clearAnalyticsStorage,
  CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  resolveRegion,
  type CookieConsent,
} from "@/lib/consent";
import css from "./CookieConsent.module.css";

// Consent choice persists in localStorage so the banner shows once and never
// reappears. lib/consent decides what it means: Accept turns analytics on;
// Reject turns it off and deletes what it stored; with no choice yet, EU/UK
// visitors get none and everyone else gets it (opt-out). Supabase auth session
// storage is strictly functional (it keeps you signed in) and is never gated.

// The banner is in the server HTML (hidden) and this runs as the HTML parses,
// so a first visit sees it with the first paint rather than after hydration.
const BANNER_ID = "cookie-consent";
const REVEAL = `try{if(!localStorage.getItem(${JSON.stringify(COOKIE_CONSENT_KEY)}))document.getElementById(${JSON.stringify(BANNER_ID)}).hidden=false}catch(e){}`;

/**
 * First-visit cookie consent banner. Deliberately simple (US product): a brief
 * note, a link to the Cookie Policy, and Accept / Reject. A small paper card
 * in the site's own voice rather than a bolted-on third-party widget.
 * Mounted once in the root layout.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(COOKIE_CONSENT_KEY)) setVisible(true);
    } catch {
      // localStorage blocked (private mode): just don't show the banner.
    }
    // Whenever analytics isn't allowed (Reject, or an opt-in visitor who hasn't
    // accepted), nothing it stored earlier is kept.
    const sweep = () => {
      if (analyticsAllowed() === false) clearAnalyticsStorage();
    };
    sweep();
    void resolveRegion();
    window.addEventListener(CONSENT_EVENT, sweep);
    return () => window.removeEventListener(CONSENT_EVENT, sweep);
  }, []);

  function choose(choice: CookieConsent) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    } catch {
      // Non-fatal: hide the banner either way so it isn't a nag.
    }
    // Let other fixed elements (e.g. the sticky mobile CTA) react immediately,
    // without waiting for a scroll or reload.
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setVisible(false);
  }

  return (
    <>
      <div
        id={BANNER_ID}
        className={css.banner}
        role="dialog"
        aria-label="Cookie consent"
        aria-live="polite"
        hidden={!visible}
        // The inline script below may un-hide it before React hydrates.
        suppressHydrationWarning
      >
        <p className={css.text}>
          We use a few cookies to keep you signed in and to understand how the
          planner gets used. Read our{" "}
          <Link href="/cookies" className={css.link}>
            Cookie Policy
          </Link>
          .
        </p>
        <div className={css.actions}>
          <button
            type="button"
            onClick={() => choose("rejected")}
            className={`ds-btn ds-btn--ghost-ink ds-btn--sm ${css.btn}`}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className={`ds-btn ds-btn--ink ds-btn--sm ${css.btn}`}
          >
            Accept
          </button>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: REVEAL }} suppressHydrationWarning />
    </>
  );
}
