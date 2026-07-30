"use client";

import posthog from "posthog-js";

// PostHog event calls are wired everywhere; they no-op until
// NEXT_PUBLIC_POSTHOG_KEY is set (owner adds their own key).
export type AnalyticsEvent =
  | "flow_started"
  | "college_selected"
  | "style_selected"
  | "style_locked_clicked"
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
  | "plus_pdf_downloaded"
  | "designs_compared";

let initialized = false;

function ensureInit(): boolean {
  if (typeof window === "undefined") return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  if (!initialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
    });
    initialized = true;
  }
  return true;
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (!ensureInit()) return;
  posthog.capture(event, props);
}

/** Anonymous session id for server-side click logging (product_clicks table). */
export function sessionId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "dormscape-session";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
