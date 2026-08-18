"use client";

import { useEffect, useState } from "react";
import PlanCta from "@/components/site/PlanCta";
import { COOKIE_CONSENT_KEY } from "@/components/site/CookieConsent";

/**
 * Slim, understated sticky "Plan my room" bar for the homepage on smaller
 * screens. It slides up once the hero has scrolled away, so the primary action
 * is always one tap from the thumb without scrolling back to the header.
 *
 *  - lg:hidden — hidden at the desktop breakpoint where the header shows its own
 *    "Plan my room" CTA, so it never duplicates it. On phone/tablet the header
 *    CTA lives in the collapsed overflow menu, which is exactly where a sticky
 *    bar earns its keep.
 *  - Bottom-anchored, so it never collides with the top-right profile avatar.
 *  - Stays hidden until the cookie banner has been answered (that banner owns
 *    the bottom of the screen on a first visit), avoiding any stacking conflict.
 */
export default function StickyMobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function update() {
      let consentResolved = false;
      try {
        consentResolved = Boolean(window.localStorage.getItem(COOKIE_CONSENT_KEY));
      } catch {
        consentResolved = true; // storage blocked: don't let it hide the CTA
      }
      setShow(window.scrollY > 480 && consentResolved);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // The cookie banner dispatches this the moment a choice is made.
    window.addEventListener("dormscape:cookie-consent", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("dormscape:cookie-consent", update);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 lg:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      } transition-transform duration-300 ease-out`}
      aria-hidden={!show}
    >
      <div className="border-t border-ink/10 bg-paper/95 px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md">
        <PlanCta className="flex h-12 w-full items-center justify-center rounded-xl bg-cobalt text-base font-semibold text-white shadow-[0_10px_28px_-12px_rgba(43,78,255,0.65)] transition-colors hover:bg-cobalt-deep active:translate-y-px" />
      </div>
    </div>
  );
}
