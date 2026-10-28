"use client";

/**
 * Cookie consent (Cookie Policy, "Analytics"). Visitors in the EU, EEA, UK and
 * Switzerland, and anyone we can't place, are opt-in: no analytics cookies or
 * storage until they press Accept. Everyone else is opt-out: analytics runs
 * unless they press Reject. The region comes from /api/consent-region (Vercel's
 * country header), once per tab, and only while no choice has been made.
 */
export const COOKIE_CONSENT_KEY = "dormscape-cookie-consent";
/** Fired on window when the choice is made or the region becomes known. */
export const CONSENT_EVENT = "dormscape:cookie-consent";
export type CookieConsent = "accepted" | "rejected";

type Region = "opt-in" | "opt-out";
const REGION_KEY = "dormscape-consent-region";
let region: Region | null = null;
let pending: Promise<void> | null = null;

export function storedConsent(): CookieConsent | null {
  try {
    const v = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

function knownRegion(): Region | null {
  if (region) return region;
  try {
    const v = window.sessionStorage.getItem(REGION_KEY);
    if (v === "opt-in" || v === "opt-out") region = v;
  } catch {
    // sessionStorage blocked: resolveRegion keeps the answer in memory.
  }
  return region;
}

/** true: analytics may run. false: it may not. null: still finding out where the visitor is. */
export function analyticsAllowed(): boolean | null {
  if (typeof window === "undefined") return false;
  const choice = storedConsent();
  if (choice) return choice === "accepted";
  const r = knownRegion();
  return r ? r === "opt-out" : null;
}

/** Look up the visitor's region if it matters (no choice yet) and isn't known, then fire CONSENT_EVENT. */
export function resolveRegion(): Promise<void> {
  if (storedConsent() || knownRegion()) return Promise.resolve();
  pending ??= fetch("/api/consent-region", { cache: "no-store" })
    .then((res) => res.json() as Promise<{ optIn?: boolean }>)
    .then((d): Region => (d.optIn === false ? "opt-out" : "opt-in"))
    // Couldn't tell: treat as opt-in, the stricter rule.
    .catch((): Region => "opt-in")
    .then((r) => {
      region = r;
      try {
        window.sessionStorage.setItem(REGION_KEY, r);
      } catch {
        // kept in memory for this page
      }
      window.dispatchEvent(new Event(CONSENT_EVENT));
    });
  return pending;
}

/**
 * Delete analytics cookies and storage already set in this browser: Google
 * Analytics (_ga, _ga_*), PostHog (ph_*) and the product-click id. Run on
 * Reject, and whenever analytics isn't allowed, so nothing set earlier lingers.
 */
export function clearAnalyticsStorage() {
  const host = window.location.hostname;
  // ponytail: assumes a two-label site domain (dormscape.us), which is where GA puts _ga.
  const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (!/^(_ga|ph_)/.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
  }
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const key of Object.keys(store)) if (key.startsWith("ph_") || key === "dormscape-session") store.removeItem(key);
    } catch {
      // storage blocked: nothing stored there either
    }
  }
}
