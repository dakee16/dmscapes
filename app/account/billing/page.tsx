"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import DeleteAccountSection from "@/components/account/DeleteAccountSection";
import { AccountShell, PlanCard, ProfileCard, ToolChips, fmtDate, accountStyles as s } from "@/components/account/AccountUI";
import { ArrowRight, ArrowUpRight, Check } from "@/components/ds/Icons";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { planOf, FLEX_CREDIT_PRICE_USD } from "@/lib/plan";
import type { InvoiceItem, InvoicesResponse } from "@/lib/api-types";

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

  return (
    <PageShell>
      <AccountShell active="plan">
        {!ready ? (
          <div className={s.loading} aria-busy="true" aria-label="Loading billing">
            <div className={`${s.skeleton} ${s.skeletonTall}`} />
            <div className={s.skeleton} />
          </div>
        ) : (
          <>
            {justBought !== null && (
              <div role="status" className={s.notice}>
                <Check size={20} />
                <span>
                  <strong>{justBought} credit{justBought === 1 ? "" : "s"} added.</strong> Your next room is ready when you are.
                </span>
              </div>
            )}

            {profile ? (
              <>
                <PlanCard profile={profile} />
                <ToolChips profile={profile} />
              </>
            ) : (
              <div className={`${s.skeleton} ${s.skeletonTall}`} aria-busy="true" aria-label="Loading your plan" />
            )}

            {profile && <section id="buy-credits" className={`${s.card} ${s.buy}`} aria-labelledby="buy-credits-title">
              <div>
                <p className={s.buyKicker}>Keep the ideas coming</p>
                <h2 id="buy-credits-title" className={s.cardTitle}>
                  Buy plan credits
                </h2>
                <p className={s.cardLede}>
                  Top up at ${FLEX_CREDIT_PRICE_USD.toFixed(2)} per credit. One credit generates one room plan. Buy what you
                  need, when you need it.
                </p>
                <p className={s.flexPrice} aria-hidden="true">
                  ${FLEX_CREDIT_PRICE_USD.toFixed(2)}
                  <small>/credit</small>
                </p>
              </div>
              <BuyCreditsForm source="billing" />
            </section>}

            <section id="purchases" className={s.card} aria-labelledby="purchase-history-heading">
              <h2 id="purchase-history-heading" className={s.cardTitle}>
                Purchases
              </h2>
              {invoices === null ? (
                <div className={s.skeleton} aria-busy="true" aria-label="Loading purchases" />
              ) : invoicesFailed ? (
                <div className={s.failed} role="status">
                  <h3>History is taking a moment.</h3>
                  <p>We couldn&apos;t load your purchases. Your plan and credits are unaffected.</p>
                  <button type="button" className="ds-btn ds-btn--ghost-ink ds-btn--sm" onClick={() => window.location.reload()}>
                    Try again
                  </button>
                </div>
              ) : invoices.length > 0 ? (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col" className={s.colDate}>
                        Date
                      </th>
                      <th scope="col">Amount</th>
                      <th scope="col" className={s.colReceipt}>
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const name = inv.description ?? "Dormscape purchase";
                      const date = fmtDate(inv.created, { year: "numeric", month: "short", day: "numeric" });
                      const status = (
                        <span className={s.status} data-state={inv.status}>
                          {inv.status === "succeeded" ? "Paid" : inv.status}
                        </span>
                      );
                      const receipt = inv.receipt_url ? (
                        <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer" className={s.receipt} aria-label={`Receipt for ${name}`}>
                          Download <ArrowUpRight size={14} />
                        </a>
                      ) : (
                        <span className={s.none}>None</span>
                      );
                      return (
                        <tr key={inv.id}>
                          <td>
                            <span className={s.item}>{name}</span>
                            <span className={s.mobileMeta}>
                              {date}
                              {status}
                            </span>
                          </td>
                          <td className={s.colDate}>
                            {date}
                            {status}
                          </td>
                          <td>
                            <span className={s.amount}>{money(inv.amount, inv.currency)}</span>
                            {inv.receipt_url && <span className={s.mobileReceipt}>{receipt}</span>}
                          </td>
                          <td className={s.colReceipt}>{receipt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className={s.empty}>
                  <h3>A clean slate.</h3>
                  <p>No purchases yet. When you make one, the details and available receipts will appear here.</p>
                  {tier !== "pro" && (
                    <Link href="/pricing" className="ds-btn ds-btn--ghost-ink ds-btn--sm">
                      Explore one-time plans <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              )}
            </section>

            <div className={s.pair}>
              <ProfileCard profile={profile} email={user?.email} />
              <DeleteAccountSection onLeave={() => { guardedRef.current = true; }} />
            </div>
          </>
        )}
      </AccountShell>
    </PageShell>
  );
}
