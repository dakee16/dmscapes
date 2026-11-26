import type Stripe from "stripe";

/** The GA4 property (lib/analytics GA_ID, a client module). */
const GA_ID = "G-DSRNH55V8B";

/**
 * purchase_completed for a paid checkout, sent from the Stripe webhook so it
 * counts even though the page buyers return to (/account) is kept out of
 * analytics. PostHog gets it under the buyer's own distinct id, and GA4 (a
 * key event) through the Measurement Protocol under their GA client and
 * session ids; lib/checkout puts those ids in the session metadata only when
 * the buyer allows analytics. No id, key or GA4_API_SECRET skips that half.
 * Never throws, and gives up after a few seconds, so the webhook's answer to
 * Stripe never depends on it.
 */
export async function capturePurchase(
  session: Stripe.Checkout.Session,
  plan: string,
  send: typeof fetch = fetch
): Promise<void> {
  const md = session.metadata ?? {};
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency ?? "usd").toUpperCase();
  // Checkout pins sale: "bf2026" on purchases priced by the Black Friday offer (lib/sale.ts).
  const sale = md.sale ? { sale: md.sale } : {};
  const post = (url: string, body: unknown) =>
    send(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    })
      .then((res) => {
        if (!res.ok) console.warn("purchase_completed not captured:", new URL(url).host, res.status);
      })
      .catch(() => console.warn("purchase_completed not captured:", new URL(url).host));

  const jobs: Promise<void>[] = [];
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (key && md.ph_distinct_id) {
    // Same host as the browser (lib/analytics); a relative proxy path can't be reached from here.
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
    const base = /^https?:\/\//.test(host) ? host.replace(/\/+$/, "") : "https://us.i.posthog.com";
    jobs.push(
      post(`${base}/i/v0/e/`, {
        api_key: key,
        event: "purchase_completed",
        distinct_id: md.ph_distinct_id,
        properties: { plan, amount, currency, ...sale },
      })
    );
  }
  const secret = process.env.GA4_API_SECRET;
  if (secret && md.ga_client_id) {
    jobs.push(
      post(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_ID}&api_secret=${encodeURIComponent(secret)}`, {
        client_id: md.ga_client_id,
        events: [
          {
            name: "purchase_completed",
            params: {
              plan,
              value: amount,
              currency,
              transaction_id: session.id,
              ...sale,
              // Joins the buyer's GA session, so the key event keeps its source.
              ...(md.ga_session_id ? { session_id: md.ga_session_id } : {}),
              engagement_time_msec: 1,
            },
          },
        ],
      })
    );
  }
  await Promise.all(jobs);
}
