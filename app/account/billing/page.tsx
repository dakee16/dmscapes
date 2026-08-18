"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import { useAuth, type PlanTier } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import {
  planLabel,
  planOf,
  isPro,
  canBuyFlexCredits,
  planCreditsRemaining,
  FLEX_CREDIT_PRICE_USD,
  PLUS_PRICE_USD,
  PRO_PRICE_USD,
} from "@/lib/plan";
import type { InvoiceItem, InvoicesResponse } from "@/lib/api-types";

// Shared mono stat-line treatment (uppercase, letter-spaced), the same language
// as the header credits chip and the "200+ rooms planned" trust lines.
const EYEBROW = "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft";
const CARD = "rounded-2xl border border-ink/10 bg-card p-5 sm:p-6";

// Per-tier visual language: accent colors + the icon that marks the tier, kept
// consistent with the wordmark badges (cobalt "+" for Plus, amber crown for Pro)
// and the pricing Flex banner (ink chip + highlight bolt).
type TierUI = {
  cardBorder: string;
  iconWrap: string;
  badge: string | null;
  badgeClass: string;
};
const TIER_UI: Record<PlanTier, TierUI> = {
  pro: {
    cardBorder: "border-amber/50",
    iconWrap: "bg-amber/15 text-amber",
    badge: "Unlimited",
    badgeClass: "bg-amber/20 text-amber",
  },
  plus: {
    cardBorder: "border-cobalt/40",
    iconWrap: "bg-cobalt/12 text-cobalt",
    badge: "Active",
    badgeClass: "bg-cobalt/12 text-cobalt",
  },
  flex: {
    cardBorder: "border-ink/20",
    iconWrap: "bg-ink text-highlight",
    badge: "Active",
    badgeClass: "bg-highlight/60 text-ink",
  },
  free: {
    cardBorder: "border-ink/12",
    iconWrap: "bg-ink/8 text-ink-soft",
    badge: null,
    badgeClass: "",
  },
};

function TierIcon({ tier }: { tier: PlanTier }) {
  if (tier === "pro") {
    // Crown.
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M2.8 7.4l4 3 4.4-6a1 1 0 0 1 1.6 0l4.4 6 4-3a1 1 0 0 1 1.57 1l-1.6 8.9a1 1 0 0 1-1 .82H4.83a1 1 0 0 1-1-.82L2.24 8.4a1 1 0 0 1 1.56-1z" />
      </svg>
    );
  }
  if (tier === "flex") {
    // Bolt (à la carte).
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tier === "plus") {
    // Plus mark.
    return <span className="font-display text-2xl font-extrabold leading-none" aria-hidden="true">+</span>;
  }
  // Free: a simple sparkle/dot.
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3v18M3 12h18" strokeLinecap="round" />
    </svg>
  );
}

// "What's included" per tier, reusing the pricing-card checkmark list language.
const PERKS: Record<PlanTier, string[]> = {
  free: [
    "Real room dimensions for supported schools",
    "1 room plan to try it out",
    "Save your design to your account, free",
    "3 vibes: Minimalist, Cozy Aesthetic, Preppy",
    "Budget-aware Amazon product picks",
    "Drag-and-drop 2D layout that fits to the inch",
  ],
  flex: [
    "Everything in Free",
    `À la carte plan credits at $${FLEX_CREDIT_PRICE_USD.toFixed(2)} each`,
    "Credits never expire; top up whenever you need one",
    "3 vibes: Minimalist, Cozy Aesthetic, Preppy",
  ],
  plus: [
    "Everything in Free",
    "All 9 vibes unlocked",
    "PDF and PNG export",
    "Side-by-side design comparison",
    "Priority on add-my-school requests",
    "5 plan credits, recharge anytime",
  ],
  pro: [
    "Everything in Plus",
    "Unlimited room plans",
    "Unlimited saved designs",
    "No credits and no counters, ever",
  ],
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
}

export default function BillingPage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal, refreshProfile } = useAuth();
  const guardedRef = useRef(false);

  const [invoices, setInvoices] = useState<InvoiceItem[] | null>(null);
  const [invoicesFailed, setInvoicesFailed] = useState(false);
  const [justBought, setJustBought] = useState<number | null>(null);

  // Access control: logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  // Post-checkout ?credits=N confirmation, read once then stripped.
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

  // Purchase history from Stripe (service-role API, so send the token).
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
  const ui = TIER_UI[tier];
  const credits = planCreditsRemaining(profile);
  const designsLeft = isPro(profile) ? "∞" : String(credits ?? (tier === "free" ? 1 : 0));
  const memberSince = profile?.created_at ? fmtDate(profile.created_at, { year: "numeric", month: "long" }) : null;
  const purchasedAt = profile?.plan_purchased_at
    ? fmtDate(profile.plan_purchased_at, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div>
      <SiteHeader />
      <main className="relative">
        {/* Subtle static grid-paper texture (not the cursor-reactive hero grid),
            fading out below the fold, for visual consistency with the site. */}
        <div
          className="grid-paper grid-paper-fade pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
          {!ready ? (
            <div aria-busy="true" aria-label="Loading billing">
              <div className="h-9 w-40 animate-pulse rounded-lg bg-ink/8" />
              <div className="mt-8 h-44 animate-pulse rounded-2xl bg-ink/8" />
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

              {/* 1. TIER STATUS CARD ------------------------------------------------ */}
              <section className={`relative mt-6 overflow-hidden rounded-2xl border ${ui.cardBorder} bg-card p-6 shadow-[0_20px_50px_-30px_rgba(23,23,43,0.4)] sm:p-7`}>
                {/* Faint grid-paper wash inside the accent card. */}
                <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.4]" aria-hidden="true" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${ui.iconWrap}`}>
                      <TierIcon tier={tier} />
                    </span>
                    <div>
                      <p className={EYEBROW}>Current plan</p>
                      <div className="mt-1 flex items-center gap-2.5">
                        <span className="font-display text-3xl font-extrabold tracking-tight">
                          {planLabel(profile)}
                        </span>
                        {ui.badge && (
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${ui.badgeClass}`}>
                            {ui.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={EYEBROW}>Designs left</p>
                    <p className="mt-1 font-mono text-4xl font-bold leading-none text-cobalt">
                      {designsLeft}
                    </p>
                  </div>
                </div>

                {/* Stat lines: mono, uppercase, letter-spaced. */}
                <dl className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink/8 pt-5 sm:grid-cols-3">
                  <div>
                    <dt className={EYEBROW}>Plan credits</dt>
                    <dd className="mt-1 font-mono text-lg font-bold text-ink">
                      {isPro(profile) ? "∞" : (credits ?? (tier === "free" ? 1 : 0))}
                    </dd>
                  </div>
                  {memberSince && (
                    <div>
                      <dt className={EYEBROW}>Member since</dt>
                      <dd className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-ink">
                        {memberSince}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className={EYEBROW}>{tier === "free" ? "Billing" : "Purchased"}</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-ink">
                      {tier === "free" ? "No card on file" : purchasedAt ?? "On file"}
                    </dd>
                  </div>
                </dl>

                {tier !== "pro" && (
                  <Link
                    href="/pricing"
                    className="relative mt-5 inline-flex text-sm font-semibold text-cobalt underline-offset-2 transition-colors hover:underline"
                  >
                    {tier === "plus" ? "Go unlimited with Pro →" : "Compare all plans →"}
                  </Link>
                )}
              </section>

              {/* 4. WHAT'S INCLUDED ------------------------------------------------- */}
              <section className={`mt-6 ${CARD}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-lg font-bold tracking-tight">
                    What&rsquo;s included on {planLabel(profile)}
                  </h2>
                  {(tier === "free" || tier === "flex") && (
                    <Link href="/pricing" className="shrink-0 text-sm font-semibold text-cobalt underline-offset-2 transition-colors hover:underline">
                      See more
                    </Link>
                  )}
                </div>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {PERKS[tier].map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm leading-snug text-ink">
                      <Check />
                      {perk}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Buy credits (free / flex / plus) or Pro note --------------------- */}
              {canBuyFlexCredits(profile) ? (
                <section className={`mt-6 ${CARD}`}>
                  <h2 className="font-display text-lg font-bold tracking-tight">Buy plan credits</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    À la carte credits at ${FLEX_CREDIT_PRICE_USD.toFixed(2)} each. Each credit designs
                    one room.{" "}
                    {tier === "free" ? "Your first purchase moves you to the Flex tier." : ""}
                  </p>
                  <div className="mt-4 max-w-sm">
                    <BuyCreditsForm source="billing" />
                  </div>
                </section>
              ) : (
                <section className={`mt-6 ${CARD}`}>
                  <h2 className="font-display text-lg font-bold tracking-tight">Plan credits</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    You&rsquo;re on Pro, with unlimited room plans, so there&rsquo;s nothing to buy. Design
                    as much as you like.
                  </p>
                </section>
              )}

              {/* Payment method note --------------------------------------------- */}
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
                    Checkout that collects payment at the moment you buy. Nothing is saved or
                    charged again. There&rsquo;s no subscription to cancel.
                  </p>
                </div>
              </section>

              {/* Purchase history: cards, or an upsell for empty free/flex ------- */}
              <section className="mt-6">
                <h2 className="font-display text-lg font-bold tracking-tight">Purchase history</h2>
                <div className="mt-3">
                  {invoices === null ? (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading purchases">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-[68px] animate-pulse rounded-xl bg-ink/8" />
                      ))}
                    </div>
                  ) : invoices.length > 0 ? (
                    <ul className="space-y-3">
                      {invoices.map((inv) => (
                        <li
                          key={inv.id}
                          className="flex items-center gap-4 rounded-xl border border-ink/10 bg-card p-4 transition-shadow hover:shadow-[0_14px_36px_-22px_rgba(23,23,43,0.35)]"
                        >
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                              inv.status === "succeeded"
                                ? "bg-cobalt/10 text-cobalt"
                                : inv.status === "pending"
                                  ? "bg-highlight/50 text-ink"
                                  : "bg-[#c2321e]/10 text-[#c2321e]"
                            }`}
                            aria-hidden="true"
                          >
                            {inv.status === "succeeded" ? (
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-current" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {inv.description ?? "Dormscape purchase"}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                              {fmtDate(inv.created, { year: "numeric", month: "short", day: "numeric" })}
                              {" · "}
                              {inv.status === "succeeded" ? "Paid" : inv.status}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono text-lg font-bold text-ink">
                              {money(inv.amount, inv.currency)}
                            </p>
                            {inv.receipt_url && (
                              <a
                                href={inv.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-cobalt underline-offset-2 transition-colors hover:underline"
                              >
                                Receipt &rarr;
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : tier === "free" || tier === "flex" ? (
                    // 5. No history on a free/flex account: an upsell, not a blank.
                    <div className="overflow-hidden rounded-2xl border border-cobalt/25 bg-cobalt/[0.04] p-5 sm:p-6">
                      <p className={EYEBROW}>Do more with a one-time upgrade</p>
                      <h3 className="mt-2 font-display text-xl font-extrabold tracking-tight">
                        Unlock every vibe and tool
                      </h3>
                      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">
                        No purchases yet. Plus and Pro are one-time payments (no subscription) that
                        add the six paid vibes, PDF and PNG export, side-by-side comparison, and
                        priority school requests.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-cobalt/30 bg-white p-4">
                          <div className="flex items-baseline justify-between">
                            <span className="font-display text-lg font-extrabold">Plus</span>
                            <span className="font-mono text-sm font-semibold text-ink">
                              ${PLUS_PRICE_USD.toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                            All 9 vibes, every premium tool, 5 plan credits.
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber/40 bg-white p-4">
                          <div className="flex items-baseline justify-between">
                            <span className="font-display text-lg font-extrabold">Pro</span>
                            <span className="font-mono text-sm font-semibold text-ink">
                              ${PRO_PRICE_USD.toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                            Everything, unlimited. No credits, no counters.
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/pricing"
                        className="mt-4 inline-flex h-11 items-center rounded-xl bg-cobalt px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep"
                      >
                        Compare plans
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-ink/20 bg-white px-5 py-8 text-center">
                      <p className="text-sm text-ink-soft">
                        {invoicesFailed
                          ? "We couldn't reach Stripe just now. Refresh to try again."
                          : "No purchases on record yet."}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
