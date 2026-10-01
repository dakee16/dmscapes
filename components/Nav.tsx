"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionToggle } from "@/components/experience/MotionProvider";
import ProfileMenu from "@/components/auth/ProfileMenu";
import Wordmark from "@/components/site/Wordmark";
import HeaderCredits from "@/components/site/HeaderCredits";
import { FeedbackDialog } from "@/components/site/FeedbackLink";
import { ArrowRight, ChevronDown, CloseIcon, MenuIcon } from "@/components/ds/Icons";
import s from "./ds/SiteNav.module.css";

/** The five links the redesign's nav shows (design-handoff/designs/site/SiteNav). */
const PRIMARY = [
  { key: "how", label: "How it works", href: "/#how-it-works" },
  { key: "colleges", label: "Colleges", href: "/colleges" },
  { key: "pricing", label: "Pricing", href: "/pricing" },
  { key: "3d", label: "3D Studio", href: "/plan/draw/3d" },
  { key: "blog", label: "Blog", href: "/blog" },
] as const;

/** Everything else lives one click away, under More (and in the phone menu). */
const GROUPS = [
  { label: "Plan", caption: "Make room for your next chapter.", links: [
    { label: "Plan my room", href: "/plan", detail: "A layout and shopping list, together" },
    { label: "Draw in 2D", href: "/plan/draw", detail: "Start with your own dimensions" },
    { label: "Build in 3D", href: "/plan/draw/3d", detail: "Walls, doors and windows with Pro" },
  ] },
  { label: "My rooms", caption: "A place for your plans and your people.", links: [
    { label: "Open My rooms", href: "/rooms", detail: "Your workspaces and saved designs" },
    { label: "Plan with roommates", href: "/#together", detail: "One Pro host. Friends join free." },
  ] },
  { label: "Help", caption: "A little help before move-in.", links: [
    { label: "Room guides", href: "/blog" },
    { label: "Frequently asked", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "Feedback", href: "feedback" },
    { label: "Report a problem", href: "/report" },
  ] },
  { label: "About", caption: "The people and policies behind the plan.", links: [
    { label: "About Dormscape", href: "/about" },
    { label: "How we measure", href: "/methodology" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Cookie policy", href: "/cookies" },
    { label: "Terms of service", href: "/terms" },
  ] },
] as const;

function activeKey(pathname: string): string | null {
  if (pathname.startsWith("/colleges") || pathname.startsWith("/add-school")) return "colleges";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/plan/draw/3d")) return "3d";
  if (pathname.startsWith("/blog")) return "blog";
  return null;
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

  const groupLinks = (group: (typeof GROUPS)[number]) =>
    group.links.map((link) => link.href === "feedback"
      ? <button type="button" className={s.panelLink} key={link.href} onClick={() => { close(); setFeedback(true); }}>
          <span>{link.label}</span><span aria-hidden="true">↗</span>
        </button>
      : <Link key={link.href} className={s.panelLink}
          href={link.href === "/report" ? `/report?from=${encodeURIComponent(pathname)}` : link.href}
          aria-current={pathname === link.href ? "page" : undefined} onClick={close}>
          <span>{link.label}{"detail" in link && <small>{link.detail}</small>}</span>
          <span aria-hidden="true">↗</span>
        </Link>);

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
            <div id="nav-more" className={s.morePanel} hidden={!more} onKeyDown={panelKeys}>
              {GROUPS.map((group) => (
                <div key={group.label} className={s.card}>
                  <p className={s.cardHead}><span>{group.label}</span>{group.caption}</p>
                  {groupLinks(group)}
                </div>
              ))}
            </div>
          </div>
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
            {PRIMARY.map((link) => (
              <Link key={link.key} href={link.href} className={s.sheetBig} onClick={close}>
                {link.label}<ArrowRight size={20} />
              </Link>
            ))}
          </div>
          {GROUPS.map((group) => (
            <div key={group.label} className={s.card}>
              <p className={s.cardHead}><span>{group.label}</span>{group.caption}</p>
              {groupLinks(group)}
            </div>
          ))}
          <div className={s.sheetFoot}><MotionToggle /></div>
        </div>
      </div>
    </header>
    {feedback && <FeedbackDialog onClose={() => setFeedback(false)} />}
  </>;
}
