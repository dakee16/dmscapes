"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import AccountFrame, { Card, Row } from "@/components/account/AccountFrame";
import { fmtDate, usd } from "@/components/account/AccountUI";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import UpgradeButton from "@/components/site/UpgradeButton";
import InviteLink from "@/components/growth/InviteLink";
import { CreatorCodeForm } from "@/components/growth/CreatorCode";
import { Check } from "@/components/ds/Icons";
import { useAuth, type PlanTier, type Profile } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { STYLES } from "@/lib/styles";
import {
  headerCreditState,
  isPaid,
  planLabel,
  planOf,
  FLEX_CREDIT_PRICE_USD,
  PLUS_INITIAL_CREDITS,
  PLUS_PRICE_USD,
  PRO_PRICE_USD,
  REFERRAL_BONUS_DESIGNS,
  REFERRAL_MONTHLY_CAP,
} from "@/lib/plan";
import type { InvoiceItem, InvoicesResponse } from "@/lib/api-types";
import c from "@/components/account/AccountPage.module.css";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

// lib/plan.ts has prices but no feature lists, so the perks are the four that set tiers apart.
const PERKS: { label: string; tiers: PlanTier[] }[] = [
  { label: `All ${STYLES.length} vibes`, tiers: ["plus", "pro"] },
  { label: "Full Hall Finder rankings", tiers: ["plus", "pro"] },
  { label: "My Room with your roommates", tiers: ["pro"] },
  { label: "3D Room Builder and Room Studio", tiers: ["pro"] },
];

// Everything each plan includes, under the perks (the list the billing page had before).
const TOOLS: Record<PlanTier, string[]> = {
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
    `À la carte plan credits at ${usd(FLEX_CREDIT_PRICE_USD)} each`,
    "Credits never expire; top up whenever you need one",
    "3 vibes: Minimalist, Cozy Aesthetic, Preppy",
  ],
  plus: ["All 9 vibes", "Draw your own room", "Add your own products", "PDF and PNG export", "Compare two designs", "Priority school requests"],
  pro: [
    "Everything in Plus",
    "3D Room Builder: floors, walls, doors, and windows",
    "Live 3D Room Studio",
    "Host one shared room with up to four people",
    "Create your own vibe",
    "Unlimited saved designs",
  ],
};
const toolsTitle = (tier: PlanTier, name: string) =>
  tier === "plus" || tier === "pro" ? `Your ${name} tools · kept permanently` : tier === "flex" ? "Included with Flex" : "Included free";

/** The current plan on ink: name, what it cost (when bought), the perks it has, and the next step. */
function PlanCard({ profile }: { profile: Profile }) {
  const { openUpgrade } = useUpgrade();
  const tier = planOf(profile.plan);
  const purchasedAt = profile.plan_purchased_at ? fmtDate(profile.plan_purchased_at, { year: "numeric", month: "short", day: "numeric" }) : null;
  const price = tier === "pro" ? PRO_PRICE_USD : tier === "plus" ? PLUS_PRICE_USD : null;
  // Plans are one-time purchases: no renewal. A price only shows when the plan was bought (a creator code unlocks Plus free).
  const meta =
    tier === "flex"
      ? [`${usd(FLEX_CREDIT_PRICE_USD)} per credit`, "Pay as you go", "No subscription"]
      : tier === "free"
        ? []
        : [price && purchasedAt ? `${usd(price)} · paid once` : "One-time plan", purchasedAt ? `On ${purchasedAt}` : null, "No subscription"].filter(
            (m): m is string => Boolean(m),
          );
  return (
    <section className={c.plan} aria-labelledby="plan-title">
      <div className={c.planTop}>
        <div>
          <p className={c.planEyebrow}>Current plan</p>
          <h2 id="plan-title" className={c.planName}>
            {planLabel(profile)}
            <em>{tier === "free" ? "for now" : "plan"}</em>
          </h2>
          {tier === "free" && <p className={c.planSub}>No card, no subscription. Saving is always free.</p>}
        </div>
        {meta.length > 0 && (
          <ul className={c.planMeta}>
            {meta.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
      <ul className={c.perks}>
        {PERKS.map((p) => {
          const has = p.tiers.includes(tier);
          return (
            <li key={p.label} data-off={has ? undefined : ""}>
              {p.label}
              {!has && <span className="ds-sr"> (not in your plan)</span>}
            </li>
          );
        })}
      </ul>
      <div className={c.tools}>
        <h3 className={c.toolsTitle}>{toolsTitle(tier, planLabel(profile))}</h3>
        <ul>
          {TOOLS[tier].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className={c.planActions}>
        {tier === "free" && (
          <button type="button" className={`${c.btn} ${c.yellow}`} onClick={() => openUpgrade()}>
            Upgrade
          </button>
        )}
        {(tier === "plus" || tier === "flex") && <UpgradeButton type="pro" className={`${c.btn} ${c.outlineWhite}`} />}
        <Link href="/pricing" className={c.planLink}>
          Compare every plan
        </Link>
      </div>
    </section>
  );
}

/** Design credits on a tape measure: the count, the way to get more, and the rules that are true for this plan. */
function CreditsCard({ profile, justBought }: { profile: Profile; justBought: number | null }) {
  const { openUpgrade } = useUpgrade();
  const credit = headerCreditState(profile);
  const tier = credit.tier;
  const left = credit.designsLeft;
  // Free: Upgrade (the upgrade sheet) or Recharge (buy single credits below). Flex: Upgrade.
  // Plus: Upgrade to Pro (the Pro checkout). Pro: Top up (buy single credits below).
  const upgrade = (
    <button type="button" className={`${c.btn} ${c.ink}`} onClick={() => openUpgrade()}>
      Upgrade
    </button>
  );
  const action =
    tier === "free" ? (
      <div className={c.edit}>
        {upgrade}
        <a href="#buy-credits" className={`${c.btn} ${c.line}`}>
          Recharge
        </a>
      </div>
    ) : tier === "flex" ? (
      upgrade
    ) : tier === "plus" ? (
      <UpgradeButton type="pro" label="Upgrade to Pro" className={`${c.btn} ${c.ink}`} />
    ) : (
      <a href="#buy-credits" className={`${c.btn} ${c.ink}`}>
        Top up · {usd(FLEX_CREDIT_PRICE_USD)} per credit
      </a>
    );
  const notes = [
    "Each new plan uses a credit.",
    ...(tier === "pro" ? ["Switching between 2D and 3D uses none.", "Your Pro tools and saved designs remain available at zero credits."] : []),
  ];
  return (
    <section className={c.tape} aria-labelledby="credits-title">
      {justBought !== null && (
        <p role="status" className={c.added}>
          <Check size={14} />
          {justBought} credit{justBought === 1 ? "" : "s"} added. Your next room is ready when you are.
        </p>
      )}
      <h2 id="credits-title" className={c.tapeLabel}>
        Design credits
      </h2>
      <div className={c.tapeMain}>
        <p className={c.count}>
          <b>{left}</b>
          <em>{left === 1 ? "design left" : "designs left"}</em>
        </p>
        <div className={c.tapeAct}>{action}</div>
      </div>
      <div className={c.tapeNotes}>
        {notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </section>
  );
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
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
    }
  }, [refreshProfile]);

  // Purchase history from Stripe (service-role API, so send the token).
  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
        const res = await fetch("/api/account/invoices", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
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

  const ready = !loading && Boolean(user) && Boolean(profile);
  const tier = planOf(profile?.plan);

  return (
    <PageShell navOverlay>
      <AccountFrame page="billing" title={["Billing", "and plan."]} sub="Your plan, your design credits and your receipts." ready={ready}>
        {!ready || !profile ? (
          <>
            <div className={c.skel} aria-busy="true" aria-label="Loading billing" />
            <div className={`${c.skel} ${c.skelShort}`} />
          </>
        ) : (
          <>
            <div id="plan" className={c.group}>
              <PlanCard profile={profile} />
              {!isPaid(profile) && (
                <section id="creator-code" className={`${c.card} ${c.slim}`} aria-labelledby="creator-code-title">
                  <h3 id="creator-code-title">Have a creator code?</h3>
                  <p>A creator code unlocks Plus free: {PLUS_INITIAL_CREDITS} plan credits and every Plus tool. One per account.</p>
                  <CreatorCodeForm from="billing" />
                </section>
              )}
            </div>

            <div id="credits" className={c.group}>
              <CreditsCard profile={profile} justBought={justBought} />
              <section id="buy-credits" className={`${c.card} ${c.slim}`} aria-labelledby="buy-credits-title">
                <h3 id="buy-credits-title">Buy plan credits</h3>
                <p>
                  Top up at {usd(FLEX_CREDIT_PRICE_USD)} per credit. One credit generates one room plan. Buy what you need, when you need it.
                </p>
                <BuyCreditsForm source="billing" />
              </section>
              <section id="invite" className={`${c.card} ${c.slim}`} aria-labelledby="invite-title">
                <h3 id="invite-title">Invite friends</h3>
                <p>
                  When a friend you invite makes their first design, you each get {REFERRAL_BONUS_DESIGNS} free design. Up to {REFERRAL_MONTHLY_CAP} a
                  month from your invites.
                </p>
                <InviteLink from="billing" showStats />
              </section>
            </div>

            <Card id="payment" title="Payment and invoices" purpose="Payments are handled securely by Stripe.">
              <Row id="purchases" label="Invoices" value="Receipts for every charge" helper="View and download past invoices." />
              {invoices === null ? (
                <div className={c.empty} aria-busy="true" aria-label="Loading purchases">
                  <div className={`${c.skel} ${c.skelShort}`} />
                </div>
              ) : invoicesFailed ? (
                <div className={c.empty} role="status">
                  <h3>History is taking a moment.</h3>
                  <p>We couldn&apos;t load your purchases. Your plan and credits are unaffected.</p>
                  <button type="button" className={`${c.btn} ${c.line}`} onClick={() => window.location.reload()}>
                    Try again
                  </button>
                </div>
              ) : invoices.length > 0 ? (
                <ul className={c.purchases} aria-label="Purchases">
                  {invoices.map((inv) => {
                    const name = inv.description ?? "dormscape purchase";
                    return (
                      <li key={inv.id}>
                        <div>
                          <span className={c.pName}>{name}</span>
                          <span className={c.pMeta}>
                            {fmtDate(inv.created, { year: "numeric", month: "short", day: "numeric" })}
                            <span className={`${c.chip} ${inv.status === "succeeded" ? c.green : ""}`}>{inv.status === "succeeded" ? "Paid" : inv.status}</span>
                          </span>
                        </div>
                        <span className={c.pAmt}>{money(inv.amount, inv.currency)}</span>
                        {inv.receipt_url ? (
                          <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer" className={c.pLink} aria-label={`Receipt for ${name}`}>
                            Download
                          </a>
                        ) : (
                          <span className={c.muted}>None</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={c.empty}>
                  <h3>A clean slate.</h3>
                  <p>No purchases yet. When you make one, the details and available receipts will appear here.</p>
                  {tier !== "pro" && (
                    <Link href="/pricing" className={`${c.btn} ${c.line}`}>
                      Explore one-time plans
                    </Link>
                  )}
                </div>
              )}
              <Row label="Billing email" value={user?.email} />
            </Card>
          </>
        )}
      </AccountFrame>
    </PageShell>
  );
}
