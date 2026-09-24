// SERVER ONLY: callers supply the service-role client, never a browser client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_PLAN_CAP, planCreditsRemaining, planOf, type PlanFields } from "./plan";

type CreditRow = PlanFields & { id: string };
const FIELDS = "id,plan,plan_credits_remaining,free_plans_used";
const MAX_ATTEMPTS = 12;

async function read(supabase: SupabaseClient, userId: string): Promise<CreditRow> {
  const { data, error } = await supabase.from("profiles").select(FIELDS).eq("id", userId).maybeSingle();
  if (error || !data) throw new Error("Could not load the plan balance.");
  return data as CreditRow;
}

/** Compare-and-swap at the database row: concurrent spends/top-ups cannot overwrite
 * one another. Uses existing columns, with no dependency on legacy metering RPCs.
 * A failed update returns no row and retries from the new balance. */
async function write(supabase: SupabaseClient, row: CreditRow, values: Record<string, unknown>): Promise<boolean> {
  let query = supabase.from("profiles").update(values).eq("id", row.id);
  for (const field of ["plan", "plan_credits_remaining", "free_plans_used"] as const) {
    query = row[field] == null ? query.is(field, null) : query.eq(field, row[field]);
  }
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error("Could not update the plan balance.");
  return Boolean(data);
}

export async function spendPlanCredit(supabase: SupabaseClient, userId: string): Promise<{ blocked: boolean; remaining: number }> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const row = await read(supabase, userId);
    const free = planOf(row.plan) === "free";
    const remaining = free ? Math.max(0, FREE_PLAN_CAP - (row.free_plans_used ?? 0)) : planCreditsRemaining(row) ?? 0;
    if (remaining <= 0) return { blocked: true, remaining: 0 };
    const values = free ? { free_plans_used: (row.free_plans_used ?? 0) + 1 } : { plan_credits_remaining: remaining - 1 };
    if (await write(supabase, row, values)) return { blocked: false, remaining: remaining - 1 };
  }
  throw new Error("Your balance changed. Please try again.");
}

/** Top-ups preserve the current tier and existing purchased balance. Free moves
 * to Flex. A completed Plus recharge also remains valid after upgrading to Pro. */
export async function addPlanCredits(supabase: SupabaseClient, userId: string, amount: number, plusRecharge = false): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid credit amount.");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const row = await read(supabase, userId);
    const tier = planOf(row.plan);
    if (plusRecharge && tier !== "plus" && tier !== "pro") throw new Error("Recharge requires a paid plan.");
    const balance = planCreditsRemaining(row) ?? Math.max(0, row.plan_credits_remaining ?? 0);
    if (!Number.isSafeInteger(balance + amount)) throw new Error("Credit balance is too large.");
    if (await write(supabase, row, { plan: tier === "free" ? "flex" : tier, plan_credits_remaining: balance + amount })) return;
  }
  throw new Error("Your balance changed. Please try again.");
}

/** A paid upgrade adds its included allowance without discarding credits the
 * customer already bought. Late Plus payments must never downgrade Pro. */
export async function grantPurchasedPlan(supabase: SupabaseClient, userId: string, tier: "plus" | "pro", amount: number, customerId: string | null): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid credit amount.");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const row = await read(supabase, userId);
    const balance = planCreditsRemaining(row) ?? Math.max(0, row.plan_credits_remaining ?? 0);
    if (!Number.isSafeInteger(balance + amount)) throw new Error("Credit balance is too large.");
    if (await write(supabase, row, {
      plan: planOf(row.plan) === "pro" ? "pro" : tier,
      plan_credits_remaining: balance + amount,
      save_credits_remaining: null,
      plus_features_unlocked: true,
      plan_purchased_at: new Date().toISOString(),
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })) return;
  }
  throw new Error("Your balance changed. Please try again.");
}
