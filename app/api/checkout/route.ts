import { NextResponse } from "next/server";
import type Stripe from "stripe";
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
  FLEX_CREDIT_PRICE_CENTS,
  FLEX_MIN_QTY,
  FLEX_MAX_QTY,
  PURCHASE_TYPES,
  type PurchaseType,
} from "@/lib/plan";

// Stripe's Node SDK needs the Node runtime, not edge.
export const runtime = "nodejs";

// Per-purchase config: price (falls back to inline price_data when no env price
// id is set), the Stripe line-item copy, and the post-payment redirect.
// Only the three fixed-price purchases live here; "flex_credits" is
// quantity-priced and handled in its own branch below, so it's excluded.
const CFG: Record<
  Exclude<PurchaseType, "flex_credits">,
  { cents: number; envKey: string; name: string; description: string; success: string }
> = {
  plus: {
    cents: PLUS_PRICE_CENTS,
    envKey: "STRIPE_PLUS_PRICE_ID",
    name: "Dormscape Plus",
    description: `One-time upgrade: ${PLUS_INITIAL_CREDITS} plan credits and ${PLUS_INITIAL_CREDITS} saves, all 9 vibes, and PDF/PNG export, comparison, and priority school requests unlocked for good.`,
    success: "upgraded=plus",
  },
  pro: {
    cents: PRO_PRICE_CENTS,
    envKey: "STRIPE_PRO_PRICE_ID",
    name: "Dormscape Pro",
    description:
      "One-time upgrade: unlimited plans and saves, all 9 vibes, and every premium feature, forever.",
    success: "upgraded=pro",
  },
  recharge: {
    cents: RECHARGE_PRICE_CENTS,
    envKey: "STRIPE_RECHARGE_PRICE_ID",
    name: "Dormscape Plus recharge",
    description: `${RECHARGE_CREDITS} more plan credits and ${RECHARGE_CREDITS} more saves added to your Plus account.`,
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
  // Flex à-la-carte credit quantity (only used when type === "flex_credits").
  let quantity = 0;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      quantity?: number;
    };
    if (body.type && PURCHASE_TYPES.includes(body.type as PurchaseType)) {
      type = body.type as PurchaseType;
    } else if (body.type) {
      return NextResponse.json({ error: "Unknown purchase type." }, { status: 400 });
    }
    if (typeof body.quantity === "number" && Number.isFinite(body.quantity)) {
      quantity = Math.floor(body.quantity);
    }
  } catch {
    // Empty body is fine; defaults to "plus".
  }

  // Validate the Flex credit quantity up front so a bad value never reaches
  // Stripe. Clamp to the sane [MIN, MAX] range; a non-positive quantity is a
  // client bug, so reject it rather than silently charging for one credit.
  if (type === "flex_credits") {
    if (quantity < FLEX_MIN_QTY) {
      return NextResponse.json(
        { error: `Choose at least ${FLEX_MIN_QTY} credit.` },
        { status: 400 }
      );
    }
    quantity = Math.min(quantity, FLEX_MAX_QTY);
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
    // Flex credits are for Free, Flex, and Plus. Pro is already unlimited, so
    // selling it à-la-carte credits makes no sense, block it.
    if (type === "flex_credits" && plan === "pro") {
      return NextResponse.json(
        { error: "Pro already has unlimited plans, so no credits are needed.", alreadyOwned: true },
        { status: 409 }
      );
    }
    email = data?.email ?? undefined;
    customerId = data?.stripe_customer_id ?? undefined;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  // Build line items, the success redirect, and the metadata per purchase type.
  // flex_credits is quantity-priced ($1.99 × N, quantity on the line item); the
  // other three are fixed and pull an optional env price id. The webhook reads
  // metadata.quantity to know how many credits to grant.
  const metadata: Record<string, string> = { user_id: userId, purchase: type };
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  let successUrl: string;

  if (type === "flex_credits") {
    metadata.quantity = String(quantity);
    lineItems = [
      {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: FLEX_CREDIT_PRICE_CENTS,
          product_data: {
            name: "Dormscape Flex credits",
            description: `${quantity} room-plan credit${
              quantity === 1 ? "" : "s"
            } at $1.99 each. Each credit designs one room.`,
          },
        },
      },
    ];
    successUrl = `${origin}/account/billing?credits=${quantity}`;
  } else {
    const cfg = CFG[type];
    const priceId = process.env[cfg.envKey];
    lineItems = [
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
    ];
    successUrl = `${origin}/account?${cfg.success}`;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Opt out of Managed Payments (Stripe's merchant-of-record flow, on by
      // default): it needs a product tax code we don't set, and these flat
      // one-time digital unlocks don't need automated tax at this stage.
      managed_payments: { enabled: false },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      client_reference_id: userId,
      metadata,
      payment_intent_data: { metadata },
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
