"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Avatar from "@/components/site/Avatar";
import { useAuth } from "@/lib/auth-context";
import { useStill } from "@/components/ds/useStill";
import { headerCreditState, planLabel, planOf } from "@/lib/plan";
import c from "./AccountPage.module.css";

type Page = "settings" | "billing";
type NavItem = { id: string; label: string; danger?: boolean; note?: "plan" | "credits" };
const NAV: { label: string; page: Page; items: NavItem[] }[] = [
  {
    label: "Account",
    page: "settings",
    items: [
      { id: "profile", label: "Profile" },
      { id: "security", label: "Sign-in and security" },
      { id: "emails", label: "Emails" },
      { id: "prefs", label: "Preferences" },
      { id: "delete", label: "Delete account", danger: true },
    ],
  },
  {
    label: "Billing",
    page: "billing",
    items: [
      { id: "plan", label: "Plan", note: "plan" },
      { id: "credits", label: "Design credits", note: "credits" },
      { id: "payment", label: "Payment and invoices" },
    ],
  },
];
const PATH: Record<Page, string> = { settings: "/account/settings", billing: "/account/billing" };

/** The account avatar: a profile photo or initials, ringed in the logo gradient on paid plans, grey on Free. */
export function RingAvatar({ size }: { size: 34 | 44 | 64 }) {
  const { user, profile } = useAuth();
  const name = profile?.full_name?.trim() || profile?.username || user?.email || "D";
  return (
    <span className={c.ring} data-paid={planOf(profile?.plan) !== "free" || undefined} style={{ "--s": `${size}px` } as React.CSSProperties}>
      <Avatar className={c.av} src={profile?.avatar_url} name={name} />
    </span>
  );
}

/** A section card: title, one-line purpose, then rows. */
export function Card({ id, title, purpose, danger, children }: { id: string; title: string; purpose?: ReactNode; danger?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={c.card} data-danger={danger || undefined} aria-labelledby={`${id}-title`}>
      <div className={c.cardHead}>
        <h2 id={`${id}-title`}>{title}</h2>
        {purpose && <p>{purpose}</p>}
      </div>
      {children}
    </section>
  );
}

/** One setting: label, value with a helper line, and the action on the right. `wide` lets an inline form use the action column too. */
export function Row({ label, labelId, id, value, helper, action, wide, children }: {
  label: ReactNode;
  labelId?: string;
  id?: string;
  value?: ReactNode;
  helper?: ReactNode;
  action?: ReactNode;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={c.row} id={id}>
      <div className={c.label} id={labelId}>
        {label}
      </div>
      <div className={`${c.value} ${wide ? c.wide : ""}`}>
        {value}
        {helper && <p className={c.helper}>{helper}</p>}
        {children}
      </div>
      {!wide && <div className={c.action}>{action}</div>}
    </div>
  );
}

/** The account switch: role="switch", named by its row label. */
export function Switch({ on, labelledBy, onToggle, disabled, describedBy }: { on: boolean; labelledBy: string; onToggle: () => void; disabled?: boolean; describedBy?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} aria-describedby={describedBy} disabled={disabled} onClick={onToggle} className={c.switch} />
  );
}

export type Tone = "good" | "bad" | "soft";
export type Msg = { tone: Tone; text: string } | null;
export function FieldMsg({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={c.msg} data-tone={msg.tone} role="status">
      {msg.text}
    </p>
  );
}

/**
 * Both account pages: the gridded head band with its ruler, then one menu on the left
 * (identity, Account and Billing groups, help) beside the section cards. On the page's own
 * sections the active item follows the one in view; the other page's items are links.
 * At 1023px and below the menu becomes a row of pill tabs above the cards.
 */
export default function AccountFrame({ page, title, sub, ready, children }: {
  page: Page;
  title: [string, string];
  sub: string;
  /** Sections are on the page (not the loading skeleton), so the menu can watch them. */
  ready: boolean;
  children: ReactNode;
}) {
  const { user, profile } = useAuth();
  const still = useStill();
  const own = NAV.find((g) => g.page === page)!.items.map((i) => i.id);
  const [active, setActive] = useState(own[0]);
  const navRef = useRef<HTMLElement>(null);

  // The active item is the last section whose top has passed 35% of the screen.
  useEffect(() => {
    if (!ready) return;
    const els = own.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const pick = () => {
      const line = window.innerHeight * 0.35 + 4;
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    // Watch the top 35% of the screen, with steps, so a smooth scroll still reports where it ends.
    const io = new IntersectionObserver(pick, { rootMargin: "0px 0px -65% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    els.forEach((el) => io.observe(el));
    pick();
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page]);

  // Phones: keep the active pill in view in the sideways row (without scrolling the page).
  useEffect(() => {
    const nav = navRef.current;
    const pill = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !pill || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: pill.offsetLeft - nav.offsetLeft - 16, behavior: still ? "auto" : "smooth" });
  }, [active, still]);

  function jump(e: React.MouseEvent, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  }

  const credit = profile ? headerCreditState(profile) : null;
  const username = profile?.username ?? null;

  return (
    <div className={c.page}>
      <header className={c.band}>
        <div className="ds-wrap">
          <p className={c.eyebrow}>Account</p>
          <h1 className={c.h1}>
            <span>{title[0]}</span> <em>{title[1]}</em>
          </h1>
          <p className={c.sub}>{sub}</p>
        </div>
      </header>
      <div className={`ds-wrap ${c.body}`}>
        <aside className={c.side}>
          <div className={c.sticky}>
            <div className={c.who}>
              <RingAvatar size={44} />
              <div className={c.whoText}>
                <p className={c.whoName}>
                  <span>{username ? `@${username}` : "Your account"}</span>
                  {profile && (
                    <span className={c.badge} data-tier={planOf(profile.plan)}>
                      {planLabel(profile)}
                    </span>
                  )}
                </p>
                {user?.email && <p className={c.whoEmail}>{user.email}</p>}
              </div>
            </div>
            <nav ref={navRef} className={c.nav} aria-label="Account">
              {NAV.map((g) => (
                <div key={g.label} className={c.navGroup}>
                  <p className={c.groupLabel}>{g.label}</p>
                  {g.items.map((item) => {
                    const here = g.page === page;
                    const current = here && active === item.id;
                    const note =
                      item.note === "plan" && profile ? planLabel(profile) : item.note === "credits" && credit ? String(credit.designsLeft) : null;
                    return (
                      <Link
                        key={item.id}
                        href={here ? `#${item.id}` : `${PATH[g.page]}#${item.id}`}
                        onClick={here ? (e) => jump(e, item.id) : undefined}
                        aria-current={current ? "true" : undefined}
                        data-danger={item.danger || undefined}
                        className={c.item}
                      >
                        {item.label}
                        {note && <span className={c.itemNote}>{note}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <p className={c.help}>
              Questions about your account or a charge? <Link href="/contact">Contact us</Link>
            </p>
          </div>
        </aside>
        <div className={c.main}>{children}</div>
      </div>
    </div>
  );
}
