import { getBrowserClient } from "@/lib/supabase-browser";

export type ConsumeResult = { blocked: boolean; remaining: number | null };

/**
 * Spend one plan-generation credit for the current user via /api/plan/consume
 * (server-authoritative). Returns blocked=true only when a Plus user is out of
 * credits; free and pro are always allowed. Never throws, and fails open so a
 * network hiccup never blocks planning.
 */
export async function consumePlanCredit(): Promise<ConsumeResult> {
  const supabase = getBrowserClient();
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;
  try {
    const res = await fetch("/api/plan/consume", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = (await res.json().catch(() => ({}))) as Partial<ConsumeResult>;
    return { blocked: data.blocked === true, remaining: data.remaining ?? null };
  } catch {
    return { blocked: false, remaining: null };
  }
}
