"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import css from "./CookieConsent.module.css";

// Consent choice persists in localStorage so the banner shows once and never
// reappears. "rejected" also suppresses analytics (see lib/analytics.ts
// ensureInit, which reads this key); Supabase auth session cookies are strictly
// functional (they keep you signed in) and are never gated.
export const COOKIE_CONSENT_KEY = "dormscape-cookie-consent";
export type CookieConsent = "accepted" | "rejected";

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
  }, []);

  function choose(choice: CookieConsent) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    } catch {
      // Non-fatal: hide the banner either way so it isn't a nag.
    }
    // Let other fixed elements (e.g. the sticky mobile CTA) react immediately,
    // without waiting for a scroll or reload.
    window.dispatchEvent(new Event("dormscape:cookie-consent"));
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
