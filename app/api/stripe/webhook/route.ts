import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";
import {
  PLUS_INITIAL_CREDITS,
  RECHARGE_CREDITS,
  PURCHASE_TYPES,
  type PurchaseType,
} from "@/lib/plan";
import type { SupabaseClient } from "@supabase/supabase-js";

// Signature verification needs the raw body and the Node runtime.
export const runtime = "nodejs";

/** Grant Plus: fresh 5 credits + permanent feature unlock. Idempotent given the
 *  session-id dedupe below (a replay would just set the same values). */
async function activatePlus(
  supabase: SupabaseClient,
  userId: string,
  customerId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "plus",
      plan_credits_remaining: PLUS_INITIAL_CREDITS,
      plus_features_unlocked: true,
      plan_purchased_at: new Date().toISOString(),
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq("id", userId);
  if (error) console.error("stripe webhook: plus activation failed:", error.message);
  return !error;
}

/** Grant Pro: unlimited (no credit tracking), all features. */
async function activatePro(
  supabase: SupabaseClient,
  userId: string,
  customerId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "pro",
      plan_credits_remaining: null,
      plus_features_unlocked: true,
      plan_purchased_at: new Date().toISOString(),
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq("id", userId);
  if (error) console.error("stripe webhook: pro activation failed:", error.message);
  return !error;
}

/** Add recharge credits. Atomic increment (RPC) so it never clobbers a
 *  concurrent change, and the session-id dedupe stops replays double-adding. */
async function addRecharge(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await supabase.rpc("add_plan_credits", {
    p_user_id: userId,
    p_amount: RECHARGE_CREDITS,
  });
  if (error) console.error("stripe webhook: recharge failed:", error.message);
  return !error;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Card payments complete synchronously; delayed methods fire the async event.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const userId =
    session.metadata?.user_id ??
    (typeof session.client_reference_id === "string" ? session.client_reference_id : null);
  const rawPurchase = session.metadata?.purchase ?? "plus";
  const purchase = (PURCHASE_TYPES as readonly string[]).includes(rawPurchase)
    ? (rawPurchase as PurchaseType)
    : "plus";
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!userId) {
    console.error("stripe webhook: paid session with no user_id", session.id);
    return NextResponse.json({ received: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("stripe webhook: Supabase not configured, can't apply purchase");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  // Idempotency: record this checkout session before applying it. A duplicate
  // delivery (Stripe is at-least-once) hits the primary-key conflict and is
  // skipped, which is essential for recharges since they increment credits.
  const { error: ledgerErr } = await supabase
    .from("processed_stripe_events")
    .insert({ event_id: session.id });
  if (ledgerErr) {
    if (ledgerErr.code === "23505") {
      // Already processed: acknowledge without re-applying.
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("stripe webhook: ledger insert failed:", ledgerErr.message);
    // Fail so Stripe retries rather than risk applying without a dedupe record.
    return NextResponse.json({ error: "Ledger error." }, { status: 500 });
  }

  let ok = false;
  if (purchase === "plus") ok = await activatePlus(supabase, userId, customerId);
  else if (purchase === "pro") ok = await activatePro(supabase, userId, customerId);
  else if (purchase === "recharge") ok = await addRecharge(supabase, userId);

  if (!ok) {
    // Roll back the ledger row so Stripe's retry can apply the purchase cleanly.
    await supabase.from("processed_stripe_events").delete().eq("event_id", session.id);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
