"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/auth-context";
import { headerCreditState, planLabel } from "@/lib/plan";
import s from "./account.module.css";

export { default as accountStyles } from "./account.module.css";

export function AccountHeader({ active, title, accent, description, action }: {
  active: "overview" | "billing" | "settings";
  title: string;
  accent: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <>
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>Dormscape / Your space</p>
          <h1 className={s.title}>{title} <em>{accent}</em></h1>
          <p className={s.description}>{description}</p>
        </div>
        {action && <div className={s.headerAction}>{action}</div>}
      </header>
      <nav className={s.nav} aria-label="Account navigation">
        {([
          ["overview", "/account", "My studio"],
          ["billing", "/account/billing", "Plan & billing"],
          ["settings", "/account/settings", "Settings"],
        ] as const).map(([key, href, label]) => (
          <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
    </>
  );
}

export function MembershipCard({ profile, billing = false }: { profile: Profile | null; billing?: boolean }) {
  const state = headerCreditState(profile);
  return (
    <section className={s.membership} aria-label="Your membership">
      <div className={s.cardTop}>
        <p className={s.eyebrow}>Your membership</p>
        <span className={s.memberMark} aria-hidden="true">d.</span>
      </div>
      <h2 className={s.planName}>{profile ? planLabel(profile) : "Loading…"}</h2>
      <div className={s.balance}>
        <strong>{!profile ? "…" : state.unlimited ? "∞" : state.designsLeft}</strong>
        <span>{state.unlimited ? "Unlimited room plans" : "Room plans remaining"}</span>
      </div>
      <p className={s.memberNote}>
        {!profile ? "Fetching your plan details." : state.unlimited
          ? "All the room to keep creating."
          : state.empty ? "Ready for another idea? Top up whenever you like."
          : "One plan. A whole new possibility."}
      </p>
      <div className={s.cardBottom}>
        <span>{profile?.username ? "@" + profile.username : "Dormscape member"}</span>
        <Link href={billing ? (state.unlimited ? "/plan" : "/pricing") : "/account/billing"}>
          {billing ? (state.unlimited ? "Start a plan" : "Explore plans") : "Manage plan"} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}

export function IdentityCard({ name, username, email }: { name?: string | null; username?: string | null; email?: string | null }) {
  const displayName = name?.trim() || (username ? "@" + username : "Your profile");
  const initials = (name?.trim() || username || email || "D").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return (
    <div className={s.identity}>
      <span className={s.avatar} aria-hidden="true">{initials}</span>
      <div><p className={s.eyebrow}>Made by you</p><h2>{displayName}</h2>{email && <p className={s.identityEmail}>{email}</p>}</div>
    </div>
  );
}
