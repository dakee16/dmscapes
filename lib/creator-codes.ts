// SERVER ONLY: callers supply the service-role client.
// Creator codes: a campus creator's code unlocks Plus free, once per account
// (docs/migrations/20261102_growth_loops.sql). Codes live in creator_codes, added by SQL.
import type { SupabaseClient } from "@supabase/supabase-js";
import { grantPurchasedPlan } from "./credit-ledger";
import { planOf, PLUS_INITIAL_CREDITS } from "./plan";

export const CREATOR_CODE = /^[a-z0-9_-]{2,32}$/;
/** A creator's code is their username with dots as dashes, so "Jane.Doe" finds "jane-doe". */
export const cleanCreatorCode = (raw: unknown): string =>
  typeof raw === "string" ? raw.trim().toLowerCase().replace(/^@/, "").replace(/\./g, "-") : "";

export type RedeemResult = { ok: true } | { ok: false; status: number; error: string };

export async function redeemCreatorCode(db: SupabaseClient, userId: string, raw: unknown): Promise<RedeemResult> {
  const code = cleanCreatorCode(raw);
  if (!CREATOR_CODE.test(code)) return { ok: false, status: 400, error: "That code doesn't look right. Check the spelling." };
  const { data: found, error } = await db
    .from("creator_codes")
    .select("code, max_redemptions, expires_at, active")
    .eq("code", code)
    .maybeSingle();
  if (error) return { ok: false, status: 503, error: "Creator codes aren't switched on yet. Check back soon." };
  if (!found || !found.active || (found.expires_at && Date.parse(found.expires_at) <= Date.now())) {
    return { ok: false, status: 404, error: "That code isn't valid, or it has ended." };
  }
  const { data: me } = await db.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const tier = planOf(me?.plan);
  if (tier === "plus" || tier === "pro") {
    return { ok: false, status: 409, error: `You already have ${tier === "pro" ? "Pro" : "Plus"}, so there's nothing to unlock.` };
  }
  if (found.max_redemptions != null) {
    // ponytail: count, then insert. A burst can pass the limit by a few; a locking SQL function if that matters.
    const { count } = await db.from("creator_redemptions").select("user_id", { count: "exact", head: true }).eq("code", code);
    if ((count ?? 0) >= found.max_redemptions) return { ok: false, status: 410, error: "That code has been used up." };
  }
  const { error: taken } = await db.from("creator_redemptions").insert({ user_id: userId, code });
  if (taken) {
    return taken.code === "23505"
      ? { ok: false, status: 409, error: "You've already used a creator code on this account." }
      : { ok: false, status: 503, error: "Couldn't use that code right now. Try again in a minute." };
  }
  try {
    await grantPurchasedPlan(db, userId, "plus", PLUS_INITIAL_CREDITS, null);
  } catch (error) {
    await db.from("creator_redemptions").delete().eq("user_id", userId);
    throw error;
  }
  return { ok: true };
}
