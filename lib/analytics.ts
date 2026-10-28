"use client";

import posthog from "posthog-js";
import { analyticsAllowed, clearAnalyticsStorage, CONSENT_EVENT, resolveRegion } from "./consent";

// PostHog event calls are wired everywhere; they no-op until
// NEXT_PUBLIC_POSTHOG_KEY is set (owner adds their own key).
export type AnalyticsEvent =
  | "site_search_opened"
  | "site_search_result"
  | "flow_started"
  | "college_selected"
  | "style_selected"
  | "style_locked_clicked"
  | "budget_step_viewed"
  | "budget_set"
  | "design_completed"
  | "product_clicked"
  | "product_swapped"
  | "layout_edited"
  | "share_clicked"
  | "school_submitted"
  | "auth_modal_opened"
  | "auth_completed"
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
  | "room_halls_mode";

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
          try { return /^\/(rooms|login|account|report)(\/|$)/.test(new URL(String(value), location.origin).pathname); } catch { return false; }
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
  });
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
