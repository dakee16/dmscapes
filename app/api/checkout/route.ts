import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  PLUS_INITIAL_CREDITS,
  PLUS_PRICE_CENTS,
  PRO_INITIAL_CREDITS,
  PRO_PRICE_CENTS,
  RECHARGE_PRICE_CENTS,
  CREDIT_PLAN_VERSION,
  RECHARGE_CREDITS,
  FLEX_CREDIT_PRICE_CENTS,
  FLEX_MIN_QTY,
  FLEX_MAX_QTY,
  PURCHASE_TYPES,
  SALE_BONUS_CREDITS,
  type PurchaseType,
} from "@/lib/plan";
import { SALE, isSale, salePlan } from "@/lib/sale";
import { cleanGift, giftPlanOf, type GiftDetails } from "@/lib/gift";

// Stripe's Node SDK needs the Node runtime, not edge.
export const runtime = "nodejs";

// Inline prices keep Stripe's checkout copy in sync with the current allowance.
// Plus and Pro take their price and credits from salePlan (the Black Friday offer inside its window).
const planCredits = (n: number, bonus: boolean) =>
  `${n} plan credits,${bonus ? ` including ${SALE_BONUS_CREDITS} Black Friday bonus credits,` : ""}`;
const CFG: Record<
  Exclude<PurchaseType, "flex_credits" | "gift_plus" | "gift_pro">,
  { name: string; description: (credits: number, bonus: boolean) => string; success: string }
> = {
  plus: {
    name: "dormscape Plus",
    description: (n, bonus) => `One-time upgrade: ${planCredits(n, bonus)} free saving, all 9 vibes, and PDF/PNG export, comparison, and priority school requests unlocked for good.`,
    success: "upgraded=plus",
  },
  pro: {
    name: "dormscape Pro",
    description: (n, bonus) =>
      `One-time upgrade: ${planCredits(n, bonus)} free saving, 3D Room Builder, live 3D planning, custom vibes, and all Plus tools. Top up credits separately.`,
    success: "upgraded=pro",
  },
  recharge: {
    name: "dormscape Plus recharge",
    description: () => `${RECHARGE_CREDITS} more plan credits added to your Plus account. Saving uses no credits.`,
    success: "recharged=1",
  },
};

// Gifts are sold at the regular price and allowance, never the sale's (owner: "Gift price will be the same
// as the std plan price"), so a gift redeemed after the sale is the same gift.
const GIFT = {
  plus: { cents: PLUS_PRICE_CENTS, credits: PLUS_INITIAL_CREDITS, name: "dormscape Plus gift", tools: "every Plus tool" },
  pro: { cents: PRO_PRICE_CENTS, credits: PRO_INITIAL_CREDITS, name: "dormscape Pro gift", tools: "every Pro tool" },
} as const;

/**
 * Start a one-time Stripe Checkout session for one of the three purchases:
 * Plus or Pro (priced by salePlan, lib/sale.ts), or a Plus credit recharge. The profile is
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
  // Analytics ids for the webhook's purchase_completed (lib/purchase-analytics),
  // sent by lib/checkout only when the buyer allows analytics.
  const tracking: Record<string, string> = {};
  // Gift purchases: who it's for, from whom, and a note (lib/gift cleanGift checks them below).
  let giftInput: unknown = null;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      quantity?: number;
      analytics?: Record<string, unknown> | null;
      gift?: unknown;
    };
    giftInput = body.gift ?? null;
    if (body.type && PURCHASE_TYPES.includes(body.type as PurchaseType)) {
      type = body.type as PurchaseType;
    } else if (body.type) {
      return NextResponse.json({ error: "Unknown purchase type." }, { status: 400 });
    }
    if (typeof body.quantity === "number" && Number.isFinite(body.quantity)) {
      quantity = Math.floor(body.quantity);
    }
    for (const [from, to] of [["ph", "ph_distinct_id"], ["ga", "ga_client_id"], ["gs", "ga_session_id"]] as const) {
      const id = body.analytics?.[from];
      if (typeof id === "string" && /^[\w.-]{1,100}$/.test(id)) tracking[to] = id;
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

  const giftPlan = giftPlanOf(type);
  let gift: GiftDetails | null = null;
  if (giftPlan) {
    const checked = cleanGift(giftInput);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    gift = checked.gift;
  }

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: giftPlan ? "Log in to send a gift." : "Log in to upgrade." }, { status: 401 });
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
    // Every tier can add credits while retaining its existing feature access. A gift is for someone
    // else, so the buyer's own plan doesn't matter.
    email = data?.email ?? undefined;
    customerId = data?.stripe_customer_id ?? undefined;
  }
  // Until docs/migrations/20261125_gift_codes.sql is applied there is nowhere to keep the code, so a
  // gift can't be paid for at all.
  if (giftPlan) {
    const { error } = await supabase.from("gift_codes").select("id").limit(1);
    if (error) return NextResponse.json({ error: "Gifts aren't available yet. Check back soon." }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  // One reading of the server clock decides the sale price and whether codes are allowed.
  const now = Date.now();
  // Pin each grant in server-owned metadata so an in-flight checkout keeps its offer.
  const metadata: Record<string, string> = { user_id: userId, purchase: type, credit_plan_version: CREDIT_PLAN_VERSION };
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  let successUrl: string;
  let cancelUrl = `${origin}/pricing?checkout=cancelled`;
  // The recipient and note stay on the session, which the webhook reads; the invoice and payment don't carry them.
  const giftMeta: Record<string, string> = {};

  if (giftPlan && gift) {
    const offer = GIFT[giftPlan];
    metadata.credit_amount = String(offer.credits);
    metadata.gift_plan = giftPlan;
    giftMeta.gift_to = gift.to;
    if (gift.from) giftMeta.gift_from = gift.from;
    if (gift.message) giftMeta.gift_message = gift.message;
    lineItems = [{
      quantity: 1,
      price_data: {
        currency: "usd", unit_amount: offer.cents,
        product_data: {
          name: offer.name,
          description: `A gift for ${gift.to}: ${offer.credits} plan credits and ${offer.tools}. We email them a code that never expires.`,
        },
      },
    }];
    successUrl = `${origin}/gift?sent=${giftPlan}`;
    cancelUrl = `${origin}/gift?checkout=cancelled`;
  } else if (type === "flex_credits") {
    metadata.quantity = String(quantity);
    metadata.credit_amount = String(quantity);
    lineItems = [
      {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: FLEX_CREDIT_PRICE_CENTS,
          product_data: {
            name: "dormscape Flex credits",
            description: `${quantity} room-plan credit${
              quantity === 1 ? "" : "s"
            } at $0.99 each. Each credit designs one room.`,
          },
        },
      },
    ];
    successUrl = `${origin}/account/billing?credits=${quantity}`;
  } else {
    const tier = type as keyof typeof CFG; // gifts and Flex were handled above
    const cfg = CFG[tier];
    // Decided here, on the server's clock, and pinned in metadata (session, invoice and payment)
    // so the webhook grants and a refund takes back exactly what this checkout sold.
    const offer = tier === "recharge" ? { cents: RECHARGE_PRICE_CENTS, credits: RECHARGE_CREDITS, sale: false } : salePlan(tier, now);
    metadata.credit_amount = String(offer.credits);
    if (offer.sale) metadata.sale = SALE.id;
    lineItems = [{
      quantity: 1,
      price_data: {
        currency: "usd", unit_amount: offer.cents,
        product_data: { name: cfg.name, description: cfg.description(offer.credits, offer.sale) },
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
      cancel_url: cancelUrl,
      client_reference_id: userId,
      // The analytics ids stay on the session: the invoice and payment never carry them.
      metadata: { ...metadata, ...tracking, ...giftMeta },
      // Generate a real paid invoice for the branded thank-you email.
      invoice_creation: { enabled: true, invoice_data: { metadata: { ...metadata, dormscape_email: "v1" }, footer: "Thank you for making room with dormscape. dormscape.us/contact" } },
      ...(!customerId ? { customer_creation: "always" as const } : {}),
      payment_intent_data: { metadata },
      ...(customerId
        ? { customer: customerId }
        : email
          ? { customer_email: email }
          : {}),
      // No discount codes on top of the Black Friday prices (owner, Nov 24); back on when the sale ends.
      // Gifts follow the same rule.
      allow_promotion_codes: !isSale(now),
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
