"use client";

import { useEffect, useState } from "react";
import PlanCta from "@/components/site/PlanCta";
import { COOKIE_CONSENT_KEY } from "@/components/site/CookieConsent";

/**
 * Slim, understated sticky "Plan my room" bar for the homepage on smaller
 * screens. It slides up once the hero has scrolled away, so the primary action
 * is always one tap from the thumb without scrolling back to the header.
 *
 *  - lg:hidden, hidden at the desktop breakpoint where the header shows its own
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
      // The studio reveal already has its own CTA and bottom chapter controls.
      // Let those stay visible while this section fills the phone screen.
      const studio = document.getElementById("room-in-3d")?.getBoundingClientRect();
      const inStudio = !!studio && studio.top < innerHeight * .45 && studio.bottom > innerHeight * .7;
      // The footer has its own links; don't sit on top of them.
      const footer = document.querySelector("footer")?.getBoundingClientRect();
      const atFooter = !!footer && footer.top < innerHeight - 40;
      setShow(window.scrollY > 480 && consentResolved && !inStudio && !atFooter);
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
        show ? "translate-y-0" : "pointer-events-none translate-y-[140%]"
      } transition-transform duration-300 ease-out`}
      aria-hidden={!show}
      inert={!show}
    >
      <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <PlanCta
          className="ds-btn ds-btn--blue w-full shadow-[0_14px_30px_-10px_rgba(36,73,255,0.6),0_0_0_3px_rgba(244,243,238,0.9)]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
