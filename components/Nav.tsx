"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionToggle } from "@/components/experience/MotionProvider";
import ProfileMenu from "@/components/auth/ProfileMenu";
import Wordmark from "@/components/site/Wordmark";
import HeaderCredits from "@/components/site/HeaderCredits";
import { FeedbackDialog } from "@/components/site/FeedbackLink";
import { ArrowRight, ArrowUpRight, ChevronDown, CloseIcon, MenuIcon } from "@/components/ds/Icons";
import s from "./ds/SiteNav.module.css";

/** The five links the redesign's nav shows (design-handoff/designs/site/SiteNav). */
const PRIMARY = [
  { key: "how", label: "How it works", href: "/#how-it-works" },
  { key: "colleges", label: "Colleges", href: "/colleges" },
  { key: "pricing", label: "Pricing", href: "/pricing" },
  { key: "3d", label: "3D Studio", href: "/plan/draw/3d" },
  { key: "blog", label: "Blog", href: "/blog" },
] as const;

type GroupLink = { label: string; href: string; detail?: string; tag?: string };
type Group = { key: string; label: string; caption: string; links: GroupLink[] };

/** Everything else lives one click away, under More (and in the phone menu). */
const GROUPS: Group[] = [
  { key: "plan", label: "Plan", caption: "Make room for your next chapter.", links: [
    { label: "Plan my room", href: "/plan", detail: "A layout and shopping list, together" },
    { label: "Draw in 2D", href: "/plan/draw", detail: "Start with your own dimensions" },
    { label: "Build in 3D", href: "/plan/draw/3d", detail: "Walls, doors and windows with Pro" },
  ] },
  { key: "rooms", label: "My rooms", caption: "A place for your plans and your people.", links: [
    { label: "My designs", href: "/rooms", detail: "Your workspaces and saved designs" },
    { label: "My Room", tag: "Pro", href: "/my-room", detail: "The room you share with your roommates" },
    { label: "Plan with roommates", href: "/#together", detail: "One Pro host. Friends join free." },
  ] },
  { key: "help", label: "Help", caption: "A little help before move-in.", links: [
    { label: "Room guides", href: "/blog" },
    { label: "Frequently asked", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "Feedback", href: "feedback" },
    { label: "Report a problem", href: "/report" },
  ] },
  { key: "about", label: "About", caption: "The people and policies behind the plan.", links: [
    { label: "About Dormscape", href: "/about" },
    { label: "How we measure", href: "/methodology" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Cookie policy", href: "/cookies" },
    { label: "Terms of service", href: "/terms" },
  ] },
];

function activeKey(pathname: string): string | null {
  if (pathname.startsWith("/colleges") || pathname.startsWith("/add-school")) return "colleges";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/plan/draw/3d")) return "3d";
  if (pathname.startsWith("/blog")) return "blog";
  return null;
}

/** A little room drawn on plan paper under a measuring tape: the Plan card's
 *  signature detail. Decorative only. */
function PlanSketch() {
  return (
    <div className={s.sketch} aria-hidden="true">
      <span className={s.sketchTape} />
      <svg viewBox="0 0 220 108" className={s.sketchPlan}>
        <g stroke="var(--ds-ink)" strokeWidth="1.2" fill="none" opacity="0.55">
          <path d="M14 10h192M14 6v8M206 6v8" />
          <path d="M214 22v74M210 22h8M210 96h8" />
        </g>
        <rect x="14" y="22" width="192" height="74" fill="#fff" />
        <g className={s.sketchPieces}>
          <rect x="22" y="30" width="40" height="58" rx="3" fill="#dce1f5" stroke="var(--ds-ink)" strokeWidth="1.5" />
          <path d="M22 44h40M28 34h28v7H28z" stroke="var(--ds-ink)" strokeWidth="1.2" fill="none" />
          <rect x="150" y="30" width="48" height="18" rx="2" fill="var(--ds-yellow)" stroke="var(--ds-ink)" strokeWidth="1.5" />
          <rect x="164" y="52" width="16" height="13" rx="3" fill="#fff" stroke="var(--ds-ink)" strokeWidth="1.5" />
          <rect x="86" y="50" width="52" height="32" rx="2" fill="rgba(255,79,168,0.22)" />
          <path d="M92 50v32M100 50v32M108 50v32M116 50v32M124 50v32M132 50v32" stroke="rgba(255,79,168,0.6)" strokeWidth="2" />
        </g>
        <path d="M120 96H14V22h192v74h-46" stroke="var(--ds-ink)" strokeWidth="4" fill="none" strokeLinecap="square" />
        <path d="M70 22h40" stroke="#fff" strokeWidth="4" />
        <path d="M70 20.5h40M70 23.5h40" stroke="var(--ds-ink)" strokeWidth="1" />
        <path d="M120 96V62a34 34 0 0 1 34 34" stroke="var(--ds-blue)" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
        <circle cx="120" cy="96" r="2.5" fill="var(--ds-blue)" />
      </svg>
    </div>
  );
}

export default function Nav({
  overlay = false,
  tone = "light",
}: {
  /** Float over the page's first section (homepage hero) until scrolled. */
  overlay?: boolean;
  tone?: "light" | "dark";
}) {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = () => { setMore(false); setMobileOpen(false); };
  const current = activeKey(pathname);

  useEffect(close, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!more && !mobileOpen) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[aria-modal="true"]')) return;
      const trigger = root.current?.querySelector<HTMLButtonElement>(
        more ? "[data-more]" : '[aria-controls="site-navigation"]'
      );
      close();
      trigger?.focus();
    };
    const focus = (event: FocusEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("focusin", focus);
    };
  }, [more, mobileOpen]);
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [mobileOpen]);

  function panelKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a, button"));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    event.preventDefault(); items[next]?.focus();
  }

  const linkBody = (link: GroupLink) => (
    <>
      <span className={s.rowText}>
        <span className={s.rowLabel}>
          {link.label}
          {link.tag && <span className={s.rowTag}><span className="ds-sr"> · </span>{link.tag}</span>}
        </span>
        {link.detail && <small className={s.rowDetail}>{link.detail}</small>}
      </span>
      <span className={s.rowArrow} aria-hidden="true"><ArrowUpRight size={14} strokeWidth={2.6} /></span>
    </>
  );

  const groupCard = (where: "more" | "sheet") => (group: Group, index: number) => (
    <section key={group.key} className={s.card} data-group={group.key} aria-labelledby={`${where}-group-${group.key}`}
      style={{ "--i": index } as CSSProperties}>
      <header className={s.cardHead}>
        <p className={s.cardLabel} id={`${where}-group-${group.key}`}>
          <span className={s.cardIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {group.label}
        </p>
        <p className={s.cardCaption}>{group.caption}</p>
      </header>
      <div className={s.cardBody}>
      <ul className={s.rows}>
        {group.links.map((link) => (
          <li key={link.href}>
            {link.href === "feedback"
              ? <button type="button" className={s.row} onClick={() => { close(); setFeedback(true); }}>
                  {linkBody(link)}
                </button>
              : <Link className={s.row}
                  href={link.href === "/report" ? `/report?from=${encodeURIComponent(pathname)}` : link.href}
                  aria-current={pathname === link.href ? "page" : undefined} onClick={close}>
                  {linkBody(link)}
                </Link>}
          </li>
        ))}
      </ul>
      {group.key === "plan" && <PlanSketch />}
      </div>
    </section>
  );

  return <>
    <header
      ref={root}
      className={`ds ${s.header}`}
      data-overlay={overlay}
      data-tone={tone}
      data-scrolled={scrolled || mobileOpen}
    >
      <nav className={s.bar} aria-label="Main navigation">
        <Wordmark tone={tone} />
        <div className={s.links}>
          {PRIMARY.map((link) =>
            link.href.startsWith("/#")
              ? <a key={link.key} href={link.href} className={s.link}>{link.label}</a>
              : <Link key={link.key} href={link.href} className={s.link}
                  aria-current={current === link.key ? "page" : undefined}>{link.label}</Link>)}
          <div className={s.moreWrap}>
            <button type="button" className={s.link} data-more aria-expanded={more}
              aria-controls="nav-more" onClick={() => setMore(!more)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault(); setMore(true);
                  requestAnimationFrame(() => document.getElementById("nav-more")?.querySelector<HTMLElement>("a, button")?.focus());
                }
              }}>
              More<span className={s.chev}><ChevronDown /></span>
            </button>
          </div>
        </div>
        <div id="nav-more" className={s.morePanel} hidden={!more} onKeyDown={panelKeys}>
          {GROUPS.map(groupCard("more"))}
        </div>
        <div className={s.actions}>
          <HeaderCredits />
          <div className={s.profile}><ProfileMenu /></div>
          <Link href="/plan" className={`ds-btn ds-btn--sm ${tone === "dark" ? "ds-btn--yellow" : "ds-btn--ink"} ${s.cta}`}>
            <span className={s.ctaLong}>Plan my room free</span><span className={s.ctaShort}>Plan free</span><ArrowRight size={16} />
          </Link>
          <button type="button" className={s.menuBtn} aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen} aria-controls="site-navigation" onClick={() => { setMobileOpen(!mobileOpen); setMore(false); }}>
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>
      <div id="site-navigation" className={s.sheet} data-open={mobileOpen} hidden={!mobileOpen}>
        <div className={s.sheetInner}>
          <div className={s.sheetPrimary}>
            {PRIMARY.map((link, i) => (
              <Link key={link.key} href={link.href} className={s.sheetBig} onClick={close}
                aria-current={current === link.key ? "page" : undefined} style={{ "--i": i } as CSSProperties}>
                {link.label}<ArrowRight size={22} />
              </Link>
            ))}
          </div>
          <div className={s.sheetGroups}>{GROUPS.map(groupCard("sheet"))}</div>
          <div className={s.sheetFoot}><MotionToggle /></div>
        </div>
      </div>
    </header>
    {feedback && <FeedbackDialog onClose={() => {
      setFeedback(false);
      // The Feedback item lived in a menu that has since closed: hand focus back
      // to whichever menu trigger is on screen.
      requestAnimationFrame(() => {
        const triggers = root.current?.querySelectorAll<HTMLElement>('[data-more], [aria-controls="site-navigation"]');
        Array.from(triggers ?? []).find((el) => el.getClientRects().length > 0)?.focus();
      });
    }} />}
  </>;
}
