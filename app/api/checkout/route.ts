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
  PRO_INITIAL_CREDITS,
  CREDIT_PLAN_VERSION,
  RECHARGE_CREDITS,
  FLEX_CREDIT_PRICE_CENTS,
  FLEX_MIN_QTY,
  FLEX_MAX_QTY,
  PURCHASE_TYPES,
  type PurchaseType,
} from "@/lib/plan";

// Stripe's Node SDK needs the Node runtime, not edge.
export const runtime = "nodejs";

// Inline prices keep Stripe's checkout copy in sync with the current allowance.
const CFG: Record<
  Exclude<PurchaseType, "flex_credits">,
  { cents: number; credits: number; name: string; description: string; success: string }
> = {
  plus: {
    cents: PLUS_PRICE_CENTS,
    credits: PLUS_INITIAL_CREDITS,
    name: "Dormscape Plus",
    description: `One-time upgrade: ${PLUS_INITIAL_CREDITS} plan credits, free saving, all 9 vibes, and PDF/PNG export, comparison, and priority school requests unlocked for good.`,
    success: "upgraded=plus",
  },
  pro: {
    cents: PRO_PRICE_CENTS,
    credits: PRO_INITIAL_CREDITS,
    name: "Dormscape Pro",
    description:
      `One-time upgrade: ${PRO_INITIAL_CREDITS} plan credits, free saving, 3D Room Builder, live 3D planning, custom vibes, and all Plus tools. Top up credits separately.`,
    success: "upgraded=pro",
  },
  recharge: {
    cents: RECHARGE_PRICE_CENTS,
    credits: RECHARGE_CREDITS,
    name: "Dormscape Plus recharge",
    description: `${RECHARGE_CREDITS} more plan credits added to your Plus account. Saving uses no credits.`,
    success: "recharged=1",
  },
};

/**
 * Start a one-time Stripe Checkout session for one of the three purchases:
 * Plus ($4.99), Pro ($14.99), or a Plus credit recharge ($2.99). The profile is
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
  if (!supabase) return NextResponse.json({ error: "Couldn't load your billing account. Try again." }, { status: 503 });
  {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, plan, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Couldn't load your billing account. Try again." }, { status: 503 });
    const plan = data.plan ?? "free";
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
        { error: "This recharge is for Plus accounts. Other tiers can buy credits individually.", needsPlus: true },
        { status: 409 }
      );
    }
    // Every tier can add credits while retaining its existing feature access.
    email = data?.email ?? undefined;
    customerId = data?.stripe_customer_id ?? undefined;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  // Pin each grant in server-owned metadata so an in-flight checkout keeps its offer.
  const metadata: Record<string, string> = { user_id: userId, purchase: type, credit_plan_version: CREDIT_PLAN_VERSION };
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  let successUrl: string;

  if (type === "flex_credits") {
    metadata.quantity = String(quantity);
    metadata.credit_amount = String(quantity);
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
            } at $0.99 each. Each credit designs one room.`,
          },
        },
      },
    ];
    successUrl = `${origin}/account/billing?credits=${quantity}`;
  } else {
    const cfg = CFG[type];
    metadata.credit_amount = String(cfg.credits);
    lineItems = [{
      quantity: 1,
      price_data: {
        currency: "usd", unit_amount: cfg.cents,
        product_data: { name: cfg.name, description: cfg.description },
      },
    }];
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
