import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import type { InvoiceItem, InvoicesResponse } from "@/lib/api-types";

// Stripe's Node SDK needs the Node runtime, not edge.
export const runtime = "nodejs";

/**
 * List the signed-in user's past purchases (Flex credit buys, Plus, Pro, and
 * Plus recharges) for the Billing page. Reads their stripe_customer_id from the
 * profile, then lists that customer's Stripe charges, each carries the amount,
 * status, a description, and a hosted receipt_url. Degrades to an empty list
 * (never an error page) when the account has no customer id yet or Stripe/DB
 * isn't configured, so a new account's Billing page just shows "no purchases".
 */
export async function POST(request: Request) {
  const rl = rateLimit(request, "invoices", 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Log in to view billing." }, { status: 401 });
  }

  const empty: InvoicesResponse = { invoices: [] };

  const supabase = getServiceClient();
  const stripe = getStripe();
  if (!supabase || !stripe) {
    // Billing infra not wired up locally: show an empty history, not an error.
    return NextResponse.json(empty);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    // No purchases have ever been made from this account (a customer id is only
    // attached the first time they check out), so there's nothing to list.
    return NextResponse.json(empty);
  }

  try {
    const charges = await stripe.charges.list({ customer: customerId, limit: 24 });
    const invoices: InvoiceItem[] = charges.data.map((c) => ({
      id: c.id,
      // Stripe timestamps are seconds since epoch; expose ISO for the client.
      created: new Date(c.created * 1000).toISOString(),
      amount: c.amount, // cents
      currency: c.currency,
      status: c.status, // "succeeded" | "pending" | "failed"
      description: c.description ?? null,
      receipt_url: c.receipt_url ?? null,
    }));
    return NextResponse.json({ invoices } satisfies InvoicesResponse);
  } catch (err) {
    console.error("invoices list failed:", err);
    // Don't fail the page over a Stripe hiccup; the client shows a soft note.
    return NextResponse.json(empty);
  }
}
