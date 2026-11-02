// SERVER ONLY: callers supply the service-role client.
// "Give a friend a free design, get one yourself" (docs/migrations/20261102_growth_loops.sql).
// A friend arrives through an invite link (/?ref=CODE) or a shared room (/room/ID), signs up,
// and the claim records who invited them. Their first design pays out a free design to them
// and to the inviter (up to REFERRAL_MONTHLY_CAP a month for the inviter).
import type { SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { addPlanCredits, planCreditBalance } from "./credit-ledger";
import { planOf, REFERRAL_BONUS_DESIGNS, REFERRAL_MONTHLY_CAP } from "./plan";

const newCode = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 8);
export const REF_CODE = /^[a-z0-9]{6,16}$/;
export const ROOM_ID = /^[A-Za-z0-9_-]{6,20}$/;
/** Invites are for new sign-ups: an older account can't claim one. */
const CLAIM_WINDOW_MS = 48 * 60 * 60 * 1000;

/** The user's invite code, made on first use. */
export async function referralCode(db: SupabaseClient, userId: string): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data } = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
    if (data?.referral_code) return data.referral_code as string;
    // Only fills an empty code, so two tabs can't hand out different links; a clash with
    // another user's code fails the unique index and the loop tries a new one.
    await db.from("profiles").update({ referral_code: newCode() }).eq("id", userId).is("referral_code", null);
  }
  throw new Error("Could not make an invite code.");
}

/** Friends who joined through the user's invites, and how many have made their first design. */
export async function referralStats(db: SupabaseClient, userId: string): Promise<{ joined: number; designed: number }> {
  const [joined, designed] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId).not("referral_rewarded_at", "is", null),
  ]);
  return { joined: joined.count ?? 0, designed: designed.count ?? 0 };
}

/** The @username of whoever invited this account, if anyone (and they still have one). */
export async function invitedBy(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data: me } = await db.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
  if (!me?.referred_by) return null;
  const { data: them } = await db.from("profiles").select("username").eq("id", me.referred_by).maybeSingle();
  return them?.username ?? null;
}

export type ReferralSource = { code?: unknown; room?: unknown };

/** Record who invited a brand-new account. Anything that doesn't qualify is skipped quietly. */
export async function claimReferral(db: SupabaseClient, userId: string, src: ReferralSource): Promise<boolean> {
  let referrer: string | null = null;
  if (typeof src.code === "string" && REF_CODE.test(src.code)) {
    const { data } = await db.from("profiles").select("id").eq("referral_code", src.code).maybeSingle();
    referrer = data?.id ?? null;
  } else if (typeof src.room === "string" && ROOM_ID.test(src.room)) {
    const { data } = await db.from("saved_rooms").select("user_id").eq("id", src.room).maybeSingle();
    referrer = data?.user_id ?? null;
  }
  if (!referrer || referrer === userId) return false;
  const { data: me } = await db
    .from("profiles")
    .select("created_at, plan, free_plans_used, referred_by")
    .eq("id", userId)
    .maybeSingle();
  if (!me || me.referred_by || planOf(me.plan) !== "free" || (me.free_plans_used ?? 0) > 0) return false;
  if (!(Date.now() - Date.parse(me.created_at) <= CLAIM_WINDOW_MS)) return false;
  const { data: done } = await db
    .from("profiles")
    .update({ referred_by: referrer })
    .eq("id", userId)
    .is("referred_by", null)
    .select("id")
    .maybeSingle();
  return Boolean(done);
}

/** A free design. A Free account moves to Flex (as when buying a credit) and keeps any
 * free plan it hasn't used. */
async function grantBonusDesign(db: SupabaseClient, userId: string): Promise<void> {
  const { data } = await db.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const unusedFree = planOf(data?.plan) === "free" ? await planCreditBalance(db, userId) : 0;
  await addPlanCredits(db, userId, REFERRAL_BONUS_DESIGNS + unusedFree);
}

/**
 * Call after a plan credit is spent. On a referred account's first design, it and its
 * inviter each get a free design (the inviter up to REFERRAL_MONTHLY_CAP a month).
 * Returns true when this account got its bonus. Never throws: a payout problem must not
 * fail the design that triggered it.
 */
export async function payReferral(db: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data: me } = await db.from("profiles").select("referred_by, referral_rewarded_at").eq("id", userId).maybeSingle();
    if (!me?.referred_by || me.referral_rewarded_at) return false;
    const now = new Date();
    const { data: won } = await db
      .from("profiles")
      .update({ referral_rewarded_at: now.toISOString() })
      .eq("id", userId)
      .is("referral_rewarded_at", null)
      .select("id")
      .maybeSingle();
    if (!won) return false;
    try {
      await grantBonusDesign(db, userId);
    } catch (error) {
      await db.from("profiles").update({ referral_rewarded_at: null }).eq("id", userId);
      throw error;
    }
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", me.referred_by)
      .gte("referral_rewarded_at", monthStart);
    if (count !== null && count <= REFERRAL_MONTHLY_CAP) {
      await grantBonusDesign(db, me.referred_by).catch((error) => console.error("referral inviter payout failed:", error));
    }
    return true;
  } catch (error) {
    console.error("referral payout failed:", error);
    return false;
  }
}
