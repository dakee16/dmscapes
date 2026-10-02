"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth, type PlanTier, type Profile } from "@/lib/auth-context";
import { startCheckout } from "@/lib/checkout";
import UpgradeButton from "@/components/site/UpgradeButton";
import { ArrowRight } from "@/components/ds/Icons";
import {
  headerCreditState,
  planLabel,
  planOf,
  FREE_PLAN_CAP,
  FLEX_CREDIT_PRICE_USD,
  PLUS_INITIAL_CREDITS,
  PRO_INITIAL_CREDITS,
  RECHARGE_CREDITS,
  RECHARGE_PRICE_USD,
} from "@/lib/plan";
import s from "./account.module.css";

export { default as accountStyles } from "./account.module.css";

const usd = (n: number) => `$${n.toFixed(2)}`;

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
}

/** Map the stored auth provider to a display name, or null for email/password. */
export function oauthLabel(provider: string | null | undefined): string | null {
  switch ((provider ?? "").toLowerCase()) {
    case "google":
      return "Google";
    case "azure":
    case "microsoft":
      return "Microsoft";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Shell: "Account" + section nav on the left, content on the right.  */
/* ------------------------------------------------------------------ */

export function AccountShell({ active, children }: { active: "plan" | "profile"; children: ReactNode }) {
  const onPlan = active === "plan";
  return (
    <div className={`ds-wrap ${s.shell}`}>
      <aside className={s.aside}>
        <h1 className={s.h1}>Account</h1>
        <nav className={s.sideNav} aria-label="Account sections">
          <Link href="/account/billing" aria-current={onPlan ? "page" : undefined}>
            Plan &amp; credits
          </Link>
          <Link href={onPlan ? "#purchases" : "/account/billing#purchases"}>Purchases</Link>
          <Link href="/account/settings" aria-current={onPlan ? undefined : "page"}>
            Profile &amp; sign-in
          </Link>
          <Link href="#delete-account" data-danger="">
            Delete account
          </Link>
        </nav>
      </aside>
      <div className={s.main}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan card: the tier, credits as coins, recharge / upgrade prices.  */
/* ------------------------------------------------------------------ */

const TAIL: Record<PlanTier, string> = {
  free: "on the house.",
  flex: "pay as you go.",
  plus: "yours for good.",
  pro: "yours for good.",
};

function Coins({ profile }: { profile: Profile }) {
  const c = headerCreditState(profile);
  const left = c.designsLeft;
  const free = c.tier === "free";
  const label = free
    ? `${left} of ${FREE_PLAN_CAP} free room plan${FREE_PLAN_CAP === 1 ? "" : "s"} left`
    : `${left} plan credit${left === 1 ? "" : "s"} left`;
  // One coin per credit. Free shows the spent plan too (we know the cap); paid
  // tiers can top up, so only what's left is drawn. Past five, a "+N" coin.
  const used = free ? Math.max(0, FREE_PLAN_CAP - left) : left === 0 ? 1 : 0;
  const shown = Math.min(left, 5);
  const more = left - shown;
  return (
    <div className={s.credits}>
      <div className={s.coins} role="img" aria-label={label}>
        {Array.from({ length: used }, (_, i) => (
          <span key={`u${i}`} className={s.coin} data-state="used" aria-hidden="true">
            USED
          </span>
        ))}
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={s.coin} aria-hidden="true">
            1
          </span>
        ))}
        {more > 0 && (
          <span className={s.coin} data-state="more" aria-hidden="true">
            +{more}
          </span>
        )}
      </div>
      <span className={s.creditsLabel} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

function RechargeButton() {
  const { openAuthModal } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function recharge() {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await startCheckout("recharge");
    if (res.ok) return; // browser navigates to Stripe
    setBusy(false);
    if (res.needsAuth) {
      openAuthModal("profile");
      return;
    }
    setError(res.error);
  }
  return (
    <div>
      <button type="button" onClick={recharge} disabled={busy} className={`${s.pbtn} ${s.yellow}`}>
        {busy ? "Starting checkout…" : `Recharge · ${RECHARGE_CREDITS} credits for ${usd(RECHARGE_PRICE_USD)}`}
      </button>
      {error && (
        <p className={s.planError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const PRO_NOTE = `Pro adds ${PRO_INITIAL_CREDITS} plan credits, 3D Room Builder, Live 3D Room Studio and Create your own vibe.`;

export function PlanCard({ profile }: { profile: Profile }) {
  const tier = planOf(profile.plan);
  const purchasedAt = profile.plan_purchased_at
    ? fmtDate(profile.plan_purchased_at, { year: "numeric", month: "short", day: "numeric" })
    : null;
  const sub =
    tier === "free"
      ? "No card, no subscription. Saving is always free."
      : tier === "flex"
        ? `Pay as you go · ${usd(FLEX_CREDIT_PRICE_USD)} per credit · no subscription`
        : `Paid once${purchasedAt ? ` · ${purchasedAt}` : ""} · no subscription`;

  const proButton = (
    <UpgradeButton type="pro" className={`${s.pbtn} ${s.ghost}`} />
  );

  return (
    <section id="plan" className={s.plan} data-tier={tier} aria-labelledby="plan-title">
      <div className={s.planTape} aria-hidden="true" />
      <div className={s.planTop}>
        <div>
          <p className={s.planEyebrow}>Your plan</p>
          <h2 id="plan-title" className={s.planName}>
            <b>{planLabel(profile)}</b>
            <i>{TAIL[tier]}</i>
          </h2>
          <p className={s.planSub}>{sub}</p>
        </div>
        <Coins profile={profile} />
      </div>

      <div className={s.planActions}>
        {tier === "plus" && (
          <>
            <RechargeButton />
            {proButton}
            <p className={s.planNote}>{PRO_NOTE}</p>
          </>
        )}
        {tier === "free" && (
          <>
            <UpgradeButton type="plus" className={`${s.pbtn} ${s.yellow}`} />
            {proButton}
            <p className={s.planNote}>
              Plus adds {PLUS_INITIAL_CREDITS} plan credits and every preset vibe. {PRO_NOTE}
            </p>
          </>
        )}
        {tier === "flex" && (
          <>
            <a href="#buy-credits" className={`${s.pbtn} ${s.yellow}`}>
              Buy credits · {usd(FLEX_CREDIT_PRICE_USD)} each
            </a>
            {proButton}
            <p className={s.planNote}>{PRO_NOTE}</p>
          </>
        )}
        {tier === "pro" && (
          <>
            <a href="#buy-credits" className={`${s.pbtn} ${s.yellow}`}>
              Top up · {usd(FLEX_CREDIT_PRICE_USD)} per credit
            </a>
            <p className={s.planNote}>Your Pro tools and saved designs remain available at zero credits.</p>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tools the tier keeps.                                              */
/* ------------------------------------------------------------------ */

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
  plus: [
    "All 9 vibes",
    "Draw your own room",
    "Add your own products",
    "PDF and PNG export",
    "Compare two designs",
    "Priority school requests",
  ],
  pro: [
    "Everything in Plus",
    "3D Room Builder: floors, walls, doors, and windows",
    "Live 3D Room Studio",
    "Host one shared room with up to four people",
    "Create your own vibe",
    "Unlimited saved designs",
  ],
};

export function ToolChips({ profile }: { profile: Profile }) {
  const tier = planOf(profile.plan);
  const title =
    tier === "plus" || tier === "pro"
      ? `Your ${planLabel(profile)} tools · kept permanently`
      : tier === "flex"
        ? "Included with Flex"
        : "Included free";
  return (
    <section aria-labelledby="tools-title">
      <h2 id="tools-title" className={s.toolsTitle}>
        {title}
      </h2>
      <ul className={s.tools}>
        {TOOLS[tier].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Profile summary (billing page).                                    */
/* ------------------------------------------------------------------ */

export function ProfileCard({ profile, email }: { profile: Profile | null; email?: string | null }) {
  const provider = oauthLabel(profile?.auth_provider);
  const memberSince = profile?.created_at ? fmtDate(profile.created_at, { year: "numeric", month: "long" }) : null;
  return (
    <section id="profile" className={`${s.card} ${s.mini}`} aria-labelledby="profile-title">
      <h2 id="profile-title" className={s.cardTitle}>
        Profile &amp; sign-in
      </h2>
      {email && <p className={s.email}>{email}</p>}
      <p className={s.meta}>
        {provider ? `Signed in with ${provider}` : "Signed in with email and password"}
        {memberSince ? ` · Member since ${memberSince}` : ""}
      </p>
      <Link href="/account/settings" className={s.miniLink}>
        Edit profile <ArrowRight size={16} />
      </Link>
    </section>
  );
}

/** Initials avatar used at the top of settings. */
export function IdentityCard({ name, username, email }: { name?: string | null; username?: string | null; email?: string | null }) {
  const displayName = name?.trim() || (username ? "@" + username : "Your profile");
  const initials = (name?.trim() || username || email || "D")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className={`${s.card} ${s.identity}`}>
      <span className={s.avatar} aria-hidden="true">
        {initials}
      </span>
      <div>
        <h2>{displayName}</h2>
        <p>
          {username && name?.trim() ? `@${username} · ` : ""}
          {email}
        </p>
      </div>
    </div>
  );
}
