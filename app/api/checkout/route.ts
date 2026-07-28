import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { PLUS_PRICE_CENTS } from "@/lib/plan";

// Stripe's Node SDK needs the Node runtime, not edge.
export const runtime = "nodejs";

/**
 * Start a one-time ($4.99) Stripe Checkout session to upgrade the signed-in
 * user to Plus. The actual plan flip happens server-side in the webhook after
 * Stripe confirms payment, never from the client redirect.
 */
export async function POST(request: Request) {
  const rl = rateLimit(request, "checkout", 12, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Give it a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Log in to upgrade." }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments aren't set up yet. Check back soon." },
      { status: 503 }
    );
  }

  // Pull the user's email/plan/customer so we don't double-charge and so the
  // Stripe receipt goes to the right inbox.
  let email: string | undefined;
  let customerId: string | undefined;
  const supabase = getServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("email, plan, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (data?.plan === "plus") {
      return NextResponse.json(
        { error: "You're already on Plus.", alreadyPlus: true },
        { status: 409 }
      );
    }
    email = data?.email ?? undefined;
    customerId = data?.stripe_customer_id ?? undefined;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const priceId = process.env.STRIPE_PLUS_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: PLUS_PRICE_CENTS,
                product_data: {
                  name: "Dormscape Plus",
                  description:
                    "One-time upgrade: unlimited saved designs, PDF export, side-by-side comparison, priority school requests.",
                },
              },
            },
      ],
      success_url: `${origin}/account?upgraded=1`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      client_reference_id: userId,
      metadata: { user_id: userId, plan: "plus" },
      payment_intent_data: { metadata: { user_id: userId, plan: "plus" } },
      ...(customerId
        ? { customer: customerId }
        : email
          ? { customer_email: email }
          : {}),
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Couldn't start checkout. Try again." },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe checkout create failed:", err);
    return NextResponse.json(
      { error: "Couldn't start checkout. Try again in a minute." },
      { status: 500 }
    );
  }
}
