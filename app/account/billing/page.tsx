"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import {
  planLabel,
  planOf,
  isPro,
  canBuyFlexCredits,
  planCreditsRemaining,
  FLEX_CREDIT_PRICE_USD,
} from "@/lib/plan";
import type { InvoiceItem, InvoicesResponse } from "@/lib/api-types";

const CARD = "rounded-2xl border border-ink/10 bg-card p-5 sm:p-6";

// Per-tier one-liner under the big tier label on the current-plan card.
function tierBlurb(tier: string, credits: number | null): string {
  switch (tier) {
    case "pro":
      return "Unlimited room plans and every premium feature, forever.";
    case "plus":
      return `${credits ?? 0} plan credit${credits === 1 ? "" : "s"} left, all 9 vibes and every premium feature unlocked.`;
    case "flex":
      return `${credits ?? 0} plan credit${credits === 1 ? "" : "s"} left. Buy more anytime at $${FLEX_CREDIT_PRICE_USD.toFixed(2)} each.`;
    default:
      return "1 free room plan. Buy credits to keep designing, or upgrade to Plus or Pro.";
  }
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "succeeded"
      ? "bg-cobalt/10 text-cobalt"
      : status === "pending"
        ? "bg-highlight/50 text-ink"
        : "bg-[#c2321e]/10 text-[#c2321e]";
  const label = status === "succeeded" ? "Paid" : status[0].toUpperCase() + status.slice(1);
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal, refreshProfile } = useAuth();
  const guardedRef = useRef(false);

  const [invoices, setInvoices] = useState<InvoiceItem[] | null>(null);
  const [invoicesFailed, setInvoicesFailed] = useState(false);
  // Set when returning from a successful Flex checkout (?credits=N); shows a
  // confirmation banner and triggers a profile refresh so the new balance/tier
  // are reflected immediately.
  const [justBought, setJustBought] = useState<number | null>(null);

  // Access control: logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  // Read the post-checkout ?credits=N param once, then strip it so a refresh
  // doesn't replay the banner. Refresh the profile so credits/tier are current.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const n = Number(params.get("credits"));
    if (Number.isFinite(n) && n > 0) {
      setJustBought(n);
      void refreshProfile();
      params.delete("credits");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, [refreshProfile]);

  // Load purchase history from Stripe (service-role API, so send the token).
  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const token = supabase
          ? (await supabase.auth.getSession()).data.session?.access_token
          : null;
        const res = await fetch("/api/account/invoices", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as InvoicesResponse;
        if (alive) setInvoices(data.invoices);
      } catch {
        if (alive) {
          setInvoices([]);
          setInvoicesFailed(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [loading, user, justBought]);

  const ready = !loading && Boolean(user);
  const tier = planOf(profile?.plan);
  const credits = planCreditsRemaining(profile);

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {!ready ? (
          <div aria-busy="true" aria-label="Loading billing">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-ink/8" />
            <div className="mt-8 h-40 animate-pulse rounded-2xl bg-ink/8" />
            <div className="mt-6 h-56 animate-pulse rounded-2xl bg-ink/8" />
          </div>
        ) : (
          <>
            <header>
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Saved designs
              </Link>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Billing
              </h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                Your plan, credits, and purchase history.
              </p>
            </header>

            {justBought !== null && (
              <div
                role="status"
                className="mt-6 flex items-start gap-3 rounded-xl border border-cobalt/20 bg-cobalt/[0.05] px-4 py-3.5"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cobalt text-white" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <p className="text-sm leading-relaxed text-ink">
                  Added <span className="font-semibold">{justBought} credit{justBought === 1 ? "" : "s"}</span> to
                  your account. Happy designing!
                </p>
              </div>
            )}

            {/* Current plan */}
            <section className={`mt-6 ${CARD}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Current plan
                  </p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <span className="font-display text-3xl font-extrabold tracking-tight">
                      {planLabel(profile)}
                    </span>
                    {tier !== "free" && (
                      <span className="rounded-full bg-highlight px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
                        {tier === "pro" ? "Unlimited" : "Active"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                    {tierBlurb(tier, credits)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Designs left
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold leading-none text-cobalt">
                    {isPro(profile) ? "∞" : credits ?? (tier === "free" ? 1 : 0)}
                  </p>
                </div>
              </div>
              {tier !== "pro" && (
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex text-sm font-semibold text-cobalt underline-offset-2 transition-colors hover:underline"
                >
                  {tier === "plus" ? "Go unlimited with Pro →" : "Compare plans →"}
                </Link>
              )}
            </section>

            {/* Buy credits (free / flex / plus) or Pro note */}
            {canBuyFlexCredits(profile) ? (
              <section className={`mt-6 ${CARD}`}>
                <h2 className="font-display text-lg font-bold tracking-tight">Buy plan credits</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  À la carte credits at ${FLEX_CREDIT_PRICE_USD.toFixed(2)} each. Each credit designs
                  one room. {tier === "free" ? "Your first purchase moves you to the Flex tier." : ""}
                </p>
                <div className="mt-4 max-w-sm">
                  <BuyCreditsForm source="billing" />
                </div>
              </section>
            ) : (
              <section className={`mt-6 ${CARD}`}>
                <h2 className="font-display text-lg font-bold tracking-tight">Plan credits</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  You&rsquo;re on Pro — unlimited room plans, so there&rsquo;s nothing to buy. Design
                  as much as you like.
                </p>
              </section>
            )}

            {/* Payment methods: honest to our Stripe setup. We don't store cards;
                every purchase is a one-time Stripe Checkout that collects payment
                fresh, so there are no reusable payment methods to manage. */}
            <section className={`mt-6 ${CARD}`}>
              <h2 className="font-display text-lg font-bold tracking-tight">Payment method</h2>
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <path d="M3 10h18" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="text-sm leading-relaxed text-ink-soft">
                  We don&rsquo;t store your card. Every purchase is a one-time, secure Stripe
                  Checkout that collects payment at the moment you buy — nothing is saved or
                  charged again. There&rsquo;s no subscription to cancel.
                </p>
              </div>
            </section>

            {/* Purchase history */}
            <section className="mt-6">
              <h2 className="font-display text-lg font-bold tracking-tight">Purchase history</h2>
              <div className="mt-3">
                {invoices === null ? (
                  <div className="space-y-2" aria-busy="true" aria-label="Loading purchases">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/8" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink/20 bg-white px-5 py-8 text-center">
                    <p className="text-sm text-ink-soft">
                      No purchases yet.{" "}
                      {invoicesFailed
                        ? "We couldn't reach Stripe just now — refresh to try again."
                        : "Anything you buy will show up here with a receipt."}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-ink/8 overflow-hidden rounded-xl border border-ink/10 bg-card">
                    {invoices.map((inv) => (
                      <li key={inv.id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {inv.description ?? "Dormscape purchase"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-ink-soft">
                            {new Date(inv.created).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                          {money(inv.amount, inv.currency)}
                        </span>
                        <StatusPill status={inv.status} />
                        {inv.receipt_url && (
                          <a
                            href={inv.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-sm font-semibold text-cobalt underline-offset-2 transition-colors hover:underline"
                          >
                            Receipt
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
