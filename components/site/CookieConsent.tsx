"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Consent choice persists in localStorage so the banner shows once and never
// reappears. "rejected" also suppresses analytics (see lib/analytics.ts
// ensureInit, which reads this key); Supabase auth session cookies are strictly
// functional (they keep you signed in) and are never gated.
export const COOKIE_CONSENT_KEY = "dormscape-cookie-consent";
export type CookieConsent = "accepted" | "rejected";

/**
 * First-visit cookie consent banner. Deliberately simple (US product): a brief
 * note, a link to the Cookie Policy, and Accept / Reject. Styled to match the
 * site (paper card, cobalt primary) rather than a bolted-on third-party widget.
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

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 overflow-hidden rounded-2xl border border-ink/10 bg-paper/95 p-4 shadow-[0_24px_60px_-24px_rgba(23,23,43,0.5)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-relaxed text-ink-soft">
          We use a few cookies to keep you signed in and to understand how the
          planner gets used. Read our{" "}
          <Link
            href="/cookies"
            className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
          >
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="h-10 flex-1 cursor-pointer rounded-lg border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/30 sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="h-10 flex-1 cursor-pointer rounded-lg bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
