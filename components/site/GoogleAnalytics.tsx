"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { analyticsAllowed, CONSENT_EVENT } from "@/lib/consent";

const GA_ID = "G-DSRNH55V8B";
// The pages lib/analytics keeps out of PostHog: workspace, invite and login
// URLs can carry room ids and invite tokens.
const PRIVATE_PATH = /^\/(rooms|login|account|report)(\/|$)/;

/**
 * Google Analytics (gtag.js) on every page, on the same consent rules as
 * PostHog (lib/consent): it loads once analytics is allowed (straight away
 * outside the EU/UK, after Accept inside it) and sends nothing from private
 * pages. Ads consent is denied (the cookie policy promises no advertising
 * cookies), so only analytics hits go out.
 *
 * gtag reads window["ga-disable-<id>"] before each hit, so a getter keeps the
 * rules live through client-side navigation and a Reject made mid-visit
 * (lib/consent then deletes its cookies). Consent Mode's "denied" is not used
 * for Reject: it keeps sending cookieless pings. After
 * a private page it stays off until the next full load: GA would report that
 * page's URL as the next page's referrer.
 */
export default function GoogleAnalytics() {
  const [load, setLoad] = useState(false);
  const sawPrivate = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (PRIVATE_PATH.test(pathname)) sawPrivate.current = true;
  }, [pathname]);

  useEffect(() => {
    Object.defineProperty(window, `ga-disable-${GA_ID}`, {
      configurable: true,
      get: () => analyticsAllowed() !== true || sawPrivate.current || PRIVATE_PATH.test(window.location.pathname),
    });
    const sync = () => {
      if (analyticsAllowed()) setLoad(true);
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!load) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
gtag('js', new Date());
gtag('config', '${GA_ID}', { allow_google_signals: false });`}
      </Script>
    </>
  );
}
