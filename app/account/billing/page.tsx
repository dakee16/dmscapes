"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import { AccountHeader, MembershipCard, accountStyles as s } from "@/components/account/AccountUI";
import { useAuth, type PlanTier } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import {
  planLabel,
  planOf,
  canBuyFlexCredits,
  FLEX_CREDIT_PRICE_USD,
} from "@/lib/plan";
import type { InvoiceItem, InvoicesResponse } from "@/lib/api-types";

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
  const memberSince = profile?.created_at ? fmtDate(profile.created_at, { year: "numeric", month: "long" }) : null;
  const purchasedAt = profile?.plan_purchased_at
    ? fmtDate(profile.plan_purchased_at, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div>
      <SiteHeader />
      <main id="page-content" tabIndex={-1} className={`dm-page ${s.page}`}>
        <AccountHeader active="billing" title="More room to" accent="create."
          description="Your membership, your credits, every purchase. All in one place."
          action={<Link href="/plan" className={s.secondary}>Back to planning ↗</Link>} />
        {!ready ? <div className={s.skeleton} aria-busy="true" aria-label="Loading billing" /> : (
          <>
            {justBought !== null && <div role="status" className={s.notice}>
              <strong>{justBought} credit{justBought === 1 ? "" : "s"} added.</strong> Your next room is ready when you are.
            </div>}
            <div className={s.billingGrid}>
              <div className={s.stack}>
                <MembershipCard profile={profile} billing />
                <section className={s.panel} aria-label="Membership details">
                  <dl className={s.facts}>
                    <div><dt>Payment model</dt><dd>One-time purchases</dd></div>
                    <div><dt>Renewal</dt><dd>No subscription</dd></div>
                    {memberSince && <div><dt>Member since</dt><dd>{memberSince}</dd></div>}
                    {purchasedAt && <div><dt>Plan purchased</dt><dd>{purchasedAt}</dd></div>}
                  </dl>
                </section>
                {profile && (canBuyFlexCredits(profile) ? (
                  <section className={s.topup}>
                    <p className={s.eyebrow}>Keep the ideas coming</p>
                    <h2>A little more room.</h2>
                    <p>Top up at ${FLEX_CREDIT_PRICE_USD.toFixed(2)} per credit. One credit designs one room. Buy what you need, when you need it.</p>
                    <div className={s.creditForm}><BuyCreditsForm source="billing" /></div>
                  </section>
                ) : (
                  <section className={s.topup}>
                    <p className={s.eyebrow}>The possibilities are yours</p>
                    <h2>No top-ups needed.</h2>
                    <p>Your Pro membership includes unlimited room plans. Keep exploring until it feels like you.</p>
                    <Link href="/plan" className={s.primary} style={{ marginTop: 20 }}>Create a room ↗</Link>
                  </section>
                ))}
              </div>
              <div className={s.stack}>
                <section className={s.panel}>
                  <p className={s.eyebrow}>Your creative toolkit</p>
                  <h2>{profile ? "Included with " + planLabel(profile) : "Loading your plan…"}</h2>
                  {profile && <ul className={s.perks}>{PERKS[tier].map(perk => <li key={perk}><Check />{perk}</li>)}</ul>}
                </section>
                <section className={s.history} aria-labelledby="purchase-history-heading">
                  <div className={s.sectionHeading}><div><p className={s.eyebrow}>The paper trail</p><h2 id="purchase-history-heading">Purchase history</h2></div></div>
                  {invoices === null ? <div className={s.skeleton} aria-busy="true" aria-label="Loading purchases" /> : invoicesFailed ? (
                    <div className={s.error} role="status"><h3>History is taking a moment.</h3>
                      <p>We couldn&apos;t load your purchases. Your plan and credits are unaffected.</p>
                      <button type="button" className={s.secondary} onClick={() => window.location.reload()}>Try again</button>
                    </div>
                  ) : invoices.length > 0 ? (
                    <ul className={s.ledger}>
                      {invoices.map(inv => (
                        <li key={inv.id} className={s.invoice}>
                          <div><h3>{inv.description ?? "Dormscape purchase"}</h3>
                            <p>{fmtDate(inv.created, { year: "numeric", month: "short", day: "numeric" })}
                              <span className={s.status} data-state={inv.status}>{inv.status === "succeeded" ? "Paid" : inv.status}</span>
                            </p>
                          </div>
                          <div className={s.invoiceAmount}>
                            <strong>{money(inv.amount, inv.currency)}</strong>
                            {inv.receipt_url && <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer" aria-label={`Receipt for ${inv.description ?? "Dormscape purchase"}`}>Receipt ↗</a>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={s.historyEmpty}><h3>A clean slate.</h3>
                      <p>No purchases yet. When you make one, the details and available receipts will appear here.</p>
                      {profile && tier !== "pro" && <Link href="/pricing" className={s.secondary}>Explore one-time plans ↗</Link>}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
