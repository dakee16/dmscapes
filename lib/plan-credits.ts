import { getBrowserClient } from "@/lib/supabase-browser";

import type { StyleId } from "./types";

/** seasonalFree: the server let this plan through free (a Spooky Season plan in its window). */
export type ConsumeResult = { blocked: boolean; remaining: number; seasonalFree: boolean };

/**
 * Spend one plan-generation credit for the current user via /api/plan/consume
 * (server-authoritative). Every tier is metered. A missing session, failed
 * request, or invalid response must stop generation instead of bypassing limits.
 */
export async function consumePlanCredit(style?: StyleId | null): Promise<ConsumeResult> {
  const supabase = getBrowserClient();
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;
  if (!token) throw new Error("Sign in to generate a room plan.");
  let res: Response;
  try {
    // The style lets the server decide whether this plan is a free seasonal one.
    res = await fetch("/api/plan/consume", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ style: style ?? null }),
    });
  } catch {
    throw new Error("Couldn't check your credits. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as Partial<ConsumeResult> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Couldn't check your credits. Please try again.");
  if (typeof data.blocked !== "boolean" || !Number.isSafeInteger(data.remaining) || data.remaining! < 0) {
    throw new Error("Couldn't confirm your balance. Refresh before trying again.");
  }
  return { blocked: data.blocked, remaining: data.remaining!, seasonalFree: data.seasonalFree === true };
}
