import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";

// Signature verification needs the raw body and the Node runtime.
export const runtime = "nodejs";

/** Flip a user to Plus. Idempotent: replaying the same event is a harmless
 *  no-op (the row is already plus). */
async function activatePlus(userId: string, customerId: string | null) {
  const supabase = getServiceClient();
  if (!supabase) {
    console.error("stripe webhook: Supabase not configured, can't grant Plus");
    return false;
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "plus",
      plan_purchased_at: new Date().toISOString(),
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq("id", userId);
  if (error) {
    console.error("stripe webhook: plus upgrade update failed:", error.message);
    return false;
  }
  return true;
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
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const userId =
        session.metadata?.user_id ??
        (typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : null);
      const customerId =
        typeof session.customer === "string" ? session.customer : null;
      if (userId) {
        const ok = await activatePlus(userId, customerId);
        if (!ok) {
          // Return 500 so Stripe retries; the update is idempotent.
          return NextResponse.json({ error: "Update failed." }, { status: 500 });
        }
      } else {
        console.error("stripe webhook: paid session with no user_id", session.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
