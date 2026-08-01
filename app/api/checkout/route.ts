import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  PLUS_PRICE_CENTS,
  PRO_PRICE_CENTS,
  RECHARGE_PRICE_CENTS,
  PLUS_INITIAL_CREDITS,
  RECHARGE_CREDITS,
  PURCHASE_TYPES,
  type PurchaseType,
} from "@/lib/plan";

// Stripe's Node SDK needs the Node runtime, not edge.
export const runtime = "nodejs";

// Per-purchase config: price (falls back to inline price_data when no env price
// id is set), the Stripe line-item copy, and the post-payment redirect.
const CFG: Record<
  PurchaseType,
  { cents: number; envKey: string; name: string; description: string; success: string }
> = {
  plus: {
    cents: PLUS_PRICE_CENTS,
    envKey: "STRIPE_PLUS_PRICE_ID",
    name: "Dormscape Plus",
    description: `One-time upgrade: ${PLUS_INITIAL_CREDITS} plan credits, all 9 vibes, and PDF/PNG export, comparison, and priority school requests unlocked for good.`,
    success: "upgraded=plus",
  },
  pro: {
    cents: PRO_PRICE_CENTS,
    envKey: "STRIPE_PRO_PRICE_ID",
    name: "Dormscape Pro",
    description:
      "One-time upgrade: unlimited plan credits, all 9 vibes, and every premium feature, forever.",
    success: "upgraded=pro",
  },
  recharge: {
    cents: RECHARGE_PRICE_CENTS,
    envKey: "STRIPE_RECHARGE_PRICE_ID",
    name: "Dormscape Plus recharge",
    description: `${RECHARGE_CREDITS} more plan credits added to your Plus account.`,
    success: "recharged=1",
  },
};

/**
 * Start a one-time Stripe Checkout session for one of the three purchases:
 * Plus ($7.99), Pro ($19.99), or a Plus credit recharge ($4.99). The profile is
 * only ever changed server-side in the webhook after Stripe confirms payment,
 * never from the client redirect.
 */
export async function POST(request: Request) {
  const rl = rateLimit(request, "checkout", 12, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Give it a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let type: PurchaseType = "plus";
  try {
    const body = (await request.json().catch(() => ({}))) as { type?: string };
    if (body.type && PURCHASE_TYPES.includes(body.type as PurchaseType)) {
      type = body.type as PurchaseType;
    } else if (body.type) {
      return NextResponse.json({ error: "Unknown purchase type." }, { status: 400 });
    }
  } catch {
    // Empty body is fine; defaults to "plus".
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

  // Pull email/plan/customer so we don't sell the wrong thing and the receipt
  // reaches the right inbox.
  let email: string | undefined;
  let customerId: string | undefined;
  const supabase = getServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("email, plan, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    const plan = data?.plan ?? "free";
    // Guard against buying something the account can't use.
    if (type === "plus" && (plan === "plus" || plan === "pro")) {
      return NextResponse.json(
        { error: "You already have Plus or Pro.", alreadyOwned: true },
        { status: 409 }
      );
    }
    if (type === "pro" && plan === "pro") {
      return NextResponse.json(
        { error: "You're already on Pro.", alreadyOwned: true },
        { status: 409 }
      );
    }
    if (type === "recharge" && plan !== "plus") {
      return NextResponse.json(
        { error: "Recharges are for Plus accounts. Grab Plus or Pro first.", needsPlus: true },
        { status: 409 }
      );
    }
    email = data?.email ?? undefined;
    customerId = data?.stripe_customer_id ?? undefined;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const cfg = CFG[type];
  const priceId = process.env[cfg.envKey];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Opt out of Managed Payments (Stripe's merchant-of-record flow, on by
      // default): it needs a product tax code we don't set, and these flat
      // one-time digital unlocks don't need automated tax at this stage.
      managed_payments: { enabled: false },
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: cfg.cents,
                product_data: { name: cfg.name, description: cfg.description },
              },
            },
      ],
      success_url: `${origin}/account?${cfg.success}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      client_reference_id: userId,
      metadata: { user_id: userId, purchase: type },
      payment_intent_data: { metadata: { user_id: userId, purchase: type } },
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
