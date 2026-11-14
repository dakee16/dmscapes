import type Stripe from "stripe";

/**
 * purchase_completed for a paid checkout, sent from the Stripe webhook so it
 * counts even though the page buyers return to (/account) is kept out of
 * analytics. PostHog gets it under the buyer's own distinct id, which
 * lib/checkout puts in the session metadata only when the buyer allows
 * analytics; no id or no key skips it. Never throws, and gives up after a
 * few seconds, so the webhook's answer to Stripe never depends on it.
 */
export async function capturePurchase(
  session: Stripe.Checkout.Session,
  plan: string,
  send: typeof fetch = fetch
): Promise<void> {
  const md = session.metadata ?? {};
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency ?? "usd").toUpperCase();
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
        properties: { plan, amount, currency },
      })
    );
  }
  await Promise.all(jobs);
}
