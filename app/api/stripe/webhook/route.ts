import { after, NextResponse } from "next/server";
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
import { addPlanCredits, grantPurchasedPlan, revokePurchase, reversalKey } from "@/lib/credit-ledger";
import { deliverPurchaseInvoice } from "@/lib/purchase-email";
import { capturePurchase } from "@/lib/purchase-analytics";

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

const received = () => NextResponse.json({ received: true });

/** The best plan the customer still holds without this payment: another paid Plus or Pro purchase that
 * wasn't refunded or disputed, or Plus from a creator code. */
async function keptPlan(stripe: Stripe, supabase: NonNullable<ReturnType<typeof getServiceClient>>, userId: string, except: Stripe.PaymentIntent): Promise<"plus" | "pro" | null> {
  let best: "plus" | "pro" | null = null;
  const customer = typeof except.customer === "string" ? except.customer : except.customer?.id;
  if (customer) {
    // ponytail: the newest 100 charges; a customer with more purchases than that would be checked by hand.
    const charges = await stripe.charges.list({ customer, limit: 100, expand: ["data.payment_intent"] });
    for (const c of charges.data) {
      const pi = c.payment_intent;
      if (!pi || typeof pi === "string" || pi.id === except.id || c.status !== "succeeded" || c.refunded || c.disputed || pi.metadata?.user_id !== userId) continue;
      if (pi.metadata?.purchase === "pro") return "pro";
      if (pi.metadata?.purchase === "plus") best = "plus";
    }
  }
  if (!best) {
    const { data } = await supabase.from("creator_redemptions").select("user_id").eq("user_id", userId).maybeSingle();
    if (data) best = "plus";
  }
  return best;
}

/** Refunds and chargebacks take a purchase back: its credits and, for Plus or Pro, the plan. A chargeback
 * we win gives it back. A partial refund keeps the purchase (it's a goodwill refund), and a lost chargeback
 * was already taken back when it opened. */
async function reverse(stripe: Stripe, event: Stripe.Event) {
  const object = event.data.object as Stripe.Charge | Stripe.Dispute;
  if (event.type === "charge.refunded" && !(object as Stripe.Charge).refunded) return received();
  const restore = event.type === "charge.dispute.closed";
  if (restore && (object as Stripe.Dispute).status !== "won") return received();
  const piId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
  if (!piId) return received();
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const key = reversalKey(piId, restore ? "restore" : "revoke");
  try {
    // Checkout pins what it sold on the payment (app/api/checkout).
    const pi = await stripe.paymentIntents.retrieve(piId);
    const userId = pi.metadata?.user_id;
    const purchase = PURCHASE_TYPES.find((p) => p === pi.metadata?.purchase);
    if (!userId || !purchase) return received(); // not a dormscape checkout
    const amount = creditGrant(purchase, pi.metadata);
    if (restore) {
      // Only give back what was taken.
      const { data } = await supabase.from("processed_stripe_events").select("event_id").eq("event_id", reversalKey(piId, "revoke")).maybeSingle();
      if (!data) return received();
    }
    // Once each way per payment: Stripe's repeat deliveries, or a refund after a chargeback, take nothing twice.
    const { error } = await supabase.from("processed_stripe_events").insert({ event_id: key });
    if (error?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    if (error) throw new Error(error.message);
    try {
      if (!restore) await revokePurchase(supabase, userId, purchase, amount, await keptPlan(stripe, supabase, userId, pi));
      else if (purchase === "plus" || purchase === "pro") await grantPurchasedPlan(supabase, userId, purchase, amount, null);
      else await addPlanCredits(supabase, userId, amount);
    } catch (error) {
      // Roll back the ledger row so Stripe's retry can apply it cleanly.
      await supabase.from("processed_stripe_events").delete().eq("event_id", key);
      throw error;
    }
    return received();
  } catch (error) {
    console.error(`stripe webhook: ${restore ? "giving back" : "taking back"} a purchase failed`, piId, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
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

  if (event.type === "charge.refunded" || event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    return reverse(stripe, event);
  }

  // Invoices finalize asynchronously. Keep mail retries separate from credits:
  // a Resend failure must never re-grant credits or roll back a paid upgrade.
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.metadata?.dormscape_email !== "v1") return NextResponse.json({ received: true });
    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "Email storage not configured." }, { status: 503 });
    try { await deliverPurchaseInvoice(db, stripe, invoice); }
    catch (error) {
      console.error("stripe invoice email pending:", invoice.id, error instanceof Error ? error.message : "Delivery failed");
      return NextResponse.json({ error: "Invoice email pending. Retry delivery." }, { status: 503 });
    }
    return NextResponse.json({ received: true });
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

  // Only sessions our checkout created count: it pins user_id and purchase in metadata. A Payment Link
  // or other integration on the same Stripe account can't name a user (client_reference_id) or
  // default to Plus.
  const userId = session.metadata?.user_id ?? null;
  const rawPurchase = session.metadata?.purchase ?? "";
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

  // Analytics runs after the response is sent: it can't delay or fail the webhook.
  after(() => capturePurchase(session, purchase));
  return NextResponse.json({ received: true });
}
