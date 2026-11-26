"use client";

import posthog from "posthog-js";
import { analyticsAllowed, clearAnalyticsStorage, CONSENT_EVENT, resolveRegion } from "./consent";

// PostHog event calls are wired everywhere; they no-op until
// NEXT_PUBLIC_POSTHOG_KEY is set (owner adds their own key).
export type AnalyticsEvent =
  | "site_search_opened"
  | "ai_ask_clicked"
  | "site_search_result"
  | "flow_started"
  | "college_selected"
  | "hall_selected"
  | "room_type_selected"
  | "typical_room_selected"
  | "photo_render_opened"
  | "photo_render_started"
  | "photo_render_done"
  | "photo_render_failed"
  | "style_selected"
  | "style_locked_clicked"
  | "budget_step_viewed"
  | "budget_set"
  | "design_completed"
  | "product_clicked"
  | "affiliate_click"
  | "product_swapped"
  | "layout_edited"
  | "share_clicked"
  | "school_submitted"
  | "auth_modal_opened"
  | "auth_completed"
  | "signup_completed"
  | "username_set"
  | "save_prompt_shown"
  | "design_saved"
  | "account_viewed"
  | "saved_design_opened"
  | "purchase_prompt_shown"
  | "purchase_prompt_yes"
  | "purchase_prompt_still_deciding"
  | "purchase_prompt_no"
  | "share_link_copied"
  | "share_link_shared"
  | "confirmation_page_viewed"
  | "feedback_prompt_opened"
  | "feedback_submitted"
  | "contact_submitted"
  | "premium_waitlist_signup"
  | "upgrade_prompt_shown"
  | "upgrade_cta_clicked"
  | "checkout_started"
  | "flex_credits_buy_clicked"
  | "plus_pdf_downloaded"
  | "designs_compared"
  | "plus_welcome_shown"
  | "plus_welcome_cta_clicked"
  | "plus_welcome_dismissed"
  | "plan_credit_consumed"
  | "seasonal_plan_started"
  | "season_cta_clicked"
  | "plan_blocked_no_credits"
  | "save_blocked_no_credits"
  | "cart_item_added"
  | "cart_item_removed"
  | "cart_add_over_budget_confirmed"
  | "own_item_added"
  | "signup_welcome_shown"
  | "signup_welcome_cta_clicked"
  | "signup_welcome_dismissed"
  | "purchase_thank_you_shown"
  | "purchase_thank_you_dismissed"
  // "Create your own vibe" (Pro) funnel
  | "custom_vibe_locked_clicked"
  | "custom_vibe_opened"
  | "custom_vibe_validation_failed"
  | "custom_vibe_generated"
  | "custom_vibe_regenerated"
  | "draw_room_locked_clicked"
  | "draw_room_opened"
  | "draw_room_started"
  | "drawn_room_completed"
  | "drawn_room_reused"
  // Pro 3D studio
  | "studio_snapshot"
  | "studio_hd_photo"
  | "studio_hd_photo_download"
  // Hall Finder (design-handoff/hall-finder/plan.md Analytics)
  | "hall_finder_started"
  | "finder_place_added"
  | "schedule_uploaded"
  | "schedule_parse_failed"
  | "finder_signin_gate"
  | "finder_paywall_viewed"
  | "finder_hall_selected"
  | "plan_from_finder"
  | "hall_finder_entry_clicked"
  // Hall Finder roommate mode (My Room Halls section)
  | "room_halls_viewed"
  | "room_halls_mode"
  // Growth loops: invites, the hall gallery, creator codes
  | "referral_prompt_shown"
  | "referral_prompt_cta"
  | "referral_prompt_dismissed"
  | "referral_link_copied"
  | "referral_link_shared"
  | "referral_claimed"
  | "referral_bonus_received"
  | "gallery_toggled"
  | "creator_code_opened"
  | "creator_code_redeemed"
  | "creator_code_failed"
  | "creator_applied"
  | "profile_photo_set"
  // Gift a plan (gift_purchased is sent by the Stripe webhook, lib/purchase-analytics)
  | "gift_checkout_started"
  | "gift_redeemed"
  | "gift_redeem_failed"
  // My Room live collaboration
  | "workspace_ping_sent"
  | "workspace_comment_started";

/** The GA4 property components/site/GoogleAnalytics loads. */
export const GA_ID = "G-DSRNH55V8B";

/** Pages kept out of analytics: workspace, invite, login and unsubscribe URLs can carry room ids and tokens. */
export const PRIVATE_PATH = /^\/(rooms|login|account|report|unsubscribe)(\/|$)/;

let initialized = false;

function ensureInit(): boolean {
  // Cookie consent (lib/consent): PostHog is only initialized, and only sets
  // cookies or storage, once analytics is allowed for this visitor.
  if (analyticsAllowed() !== true) return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  if (!initialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
      disable_capture_url_hashes: true,
      disable_session_recording: true,
      before_send: (event) => {
        if (!event) return null;
        const privatePath = (value: unknown) => {
          try { return PRIVATE_PATH.test(new URL(String(value), location.origin).pathname); } catch { return false; }
        };
        return privatePath(location.href) || privatePath(event.properties?.$current_url) || privatePath(event.properties?.$referrer) ? null : event;
      },
    });
    initialized = true;
  }
  return true;
}

// Events tracked while the visitor's consent region is still being looked up
// (a few hundred ms on a first visit): sent if analytics turns out to be
// allowed, dropped if not.
const waiting: [AnalyticsEvent, Record<string, unknown> | undefined][] = [];

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (typeof window !== "undefined" && analyticsAllowed() === null) {
    if (waiting.length < 20) waiting.push([event, props]);
    void resolveRegion();
    return;
  }
  if (!ensureInit()) return;
  posthog.capture(event, props);
}

if (typeof window !== "undefined") {
  window.addEventListener(CONSENT_EVENT, () => {
    const allowed = analyticsAllowed();
    if (allowed === null) return;
    const queued = waiting.splice(0);
    if (allowed) {
      for (const [event, props] of queued) track(event, props);
    } else if (initialized) {
      // Reject mid-visit: stop now (autocapture included), not on the next load.
      posthog.set_config({ disable_persistence: true });
      posthog.opt_out_capturing();
      clearAnalyticsStorage();
    }
    flushKeyEvents();
  });
}

type GaWindow = Window & { gtag?: (...args: unknown[]) => void } & Record<string, unknown>;
const keyEvents: [string, Record<string, unknown>][] = [];

/**
 * GA4 key events (marked as key events in GA4 Admin), on the same consent as
 * track(): sent with gtag once analytics is allowed and gtag has loaded
 * (GoogleAnalytics flushes on load), dropped on Reject. GA sends nothing on a
 * private page, or after one until the next full load, so a key event raised
 * then waits and goes with the page. purchase_completed, whose return page is
 * private, goes from the Stripe webhook instead (lib/purchase-analytics).
 */
export function trackKeyEvent(name: "plan_completed" | "signup_completed", params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (keyEvents.length < 10) keyEvents.push([name, params]);
  flushKeyEvents();
}

export function flushKeyEvents(): void {
  const allowed = analyticsAllowed();
  if (allowed === false) keyEvents.length = 0;
  const w = window as unknown as GaWindow;
  if (!allowed || typeof w.gtag !== "function" || w[`ga-disable-${GA_ID}`]) return;
  for (const [name, params] of keyEvents.splice(0)) w.gtag("event", name, params);
}

/**
 * signup_completed, once per account, with method "email" or "google". An account's first
 * session is the one signed in at the moment it was confirmed (the email link, or Google's
 * first sign-in); every later sign-in moves last_sign_in_at on. Counted within a day of that
 * sign-in, on a page analytics may see (a sign-up that lands on /login or /account counts on
 * the next page), and flagged per account so reloads and other tabs don't count it again.
 */
export function trackSignup(user: {
  id: string;
  created_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: { provider?: string };
}): void {
  const key = `dormscape-signup-tracked-${user.id}`;
  try {
    if (window.localStorage.getItem(key)) return;
    const signedIn = Date.parse(user.last_sign_in_at ?? "");
    const confirmed = Date.parse(user.email_confirmed_at ?? user.created_at ?? "");
    if (!(Math.abs(signedIn - confirmed) < 60_000 && Date.now() - signedIn < 86_400_000)) return;
    if (PRIVATE_PATH.test(window.location.pathname)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    return; // storage blocked: no flag, so don't risk counting it twice
  }
  const method = user.app_metadata?.provider === "google" ? "google" : "email";
  track("signup_completed", { method });
  trackKeyEvent("signup_completed", { method });
}

/**
 * Ids the Stripe webhook sends purchase_completed under (lib/purchase-analytics),
 * only while analytics is allowed for this visitor: PostHog's distinct id, and
 * GA's client and session ids from its cookies (_ga is GA1.1.<client id>;
 * _ga_<id> is GS1.1.<session id>.… or GS2.1.s<session id>$…).
 */
export function checkoutAnalyticsIds(): { ph?: string; ga?: string; gs?: string } {
  if (analyticsAllowed() !== true) return {};
  const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] ?? "";
  return {
    ph: ensureInit() ? posthog.get_distinct_id() : undefined,
    ga: /^GA\d\.\d\.(\d+\.\d+)$/.exec(cookie("_ga"))?.[1],
    gs: /^GS\d\.\d\.s?(\d+)/.exec(cookie(`_ga_${GA_ID.slice(2)}`))?.[1],
  };
}

let pageSession: string | null = null;

/**
 * Anonymous session id for server-side click logging (product_clicks table).
 * Kept in local storage only when analytics is allowed (lib/consent);
 * otherwise it lasts for this page load.
 */
export function sessionId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "dormscape-session";
  if (analyticsAllowed() !== true) return (pageSession ??= crypto.randomUUID());
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = pageSession ?? crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
