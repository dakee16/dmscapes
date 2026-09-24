import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";
import {
  PRO_INITIAL_CREDITS,
  FLEX_MIN_QTY,
  FLEX_MAX_QTY,
  PURCHASE_TYPES,
  type PurchaseType,
} from "@/lib/plan";
import { addPlanCredits, grantPurchasedPlan } from "@/lib/credit-ledger";

// Signature verification needs the raw body and the Node runtime.
export const runtime = "nodejs";

/** New checkouts pin their grant in Stripe metadata. Sessions opened before
 * this release retain the allowance they were sold; this compatibility value
 * is never used for new purchases or public plan descriptions. */
function creditGrant(purchase: PurchaseType, metadata: Stripe.Metadata | null): number {
  if (metadata?.credit_amount != null) {
    const value = Number(metadata.credit_amount);
    if (!Number.isSafeInteger(value) || value < FLEX_MIN_QTY || value > FLEX_MAX_QTY) throw new Error("Invalid checkout credit amount.");
    return value;
  }
  if (purchase === "flex_credits") {
    const quantity = Number(metadata?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < FLEX_MIN_QTY || quantity > FLEX_MAX_QTY) throw new Error("Missing checkout credit quantity.");
    return quantity;
  }
  if (purchase === "pro") return PRO_INITIAL_CREDITS;
  return 5; // Honor fixed-price Plus/recharge sessions sold before the new offer.
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
    : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!userId || !purchase) {
    console.error("stripe webhook: paid session with missing user or unknown purchase", session.id);
    return NextResponse.json({ received: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("stripe webhook: Supabase not configured, can't apply purchase");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  let amount: number;
  try { amount = creditGrant(purchase, session.metadata); }
  catch (error) {
    console.error("stripe webhook: invalid credit grant", error);
    return NextResponse.json({ error: "Invalid credit grant." }, { status: 500 });
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
  try {
    if (purchase === "plus" || purchase === "pro") {
      await grantPurchasedPlan(supabase, userId, purchase, amount, customerId);
    } else {
      await addPlanCredits(supabase, userId, amount, purchase === "recharge");
    }
    ok = true;
  } catch (error) {
    console.error("stripe webhook: credit grant failed", error);
  }

  if (!ok) {
    // Roll back the ledger row so Stripe's retry can apply the purchase cleanly.
    await supabase.from("processed_stripe_events").delete().eq("event_id", session.id);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
