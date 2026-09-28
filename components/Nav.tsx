"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionToggle } from "@/components/experience/MotionProvider";
import ProfileMenu from "@/components/auth/ProfileMenu";
import Wordmark from "@/components/site/Wordmark";
import HeaderCredits from "@/components/site/HeaderCredits";
import { FeedbackDialog } from "@/components/site/FeedbackLink";
import s from "./Navigation.module.css";

const GROUPS = [
  { label: "Plan", caption: "Make room for your next chapter.", links: [
    { label: "Plan my room", href: "/plan", detail: "A layout and shopping list, together" },
    { label: "My rooms", href: "/rooms", detail: "Your workspaces and saved designs" },
    { label: "Draw in 2D", href: "/plan/draw", detail: "Start with your own dimensions" },
    { label: "Build in 3D", href: "/plan/draw/3d", detail: "Walls, doors and windows with Pro" },
  ] },
  { label: "Explore", caption: "Find your room. Find your style.", links: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Vibes & styles", href: "/#vibes" },
    { label: "The 3D studio", href: "/#room-in-3d-end" },
    { label: "Colleges", href: "/colleges" },
    { label: "Room guides", href: "/blog" },
    { label: "Frequently asked", href: "/faq" },
  ] },
  { label: "About", caption: "The people and policies behind the plan.", links: [
    { label: "About Dormscape", href: "/about" },
    { label: "How we measure", href: "/methodology" },
    { label: "Contact", href: "/contact" },
    { label: "Feedback", href: "feedback" },
    { label: "Report a problem", href: "/report" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Cookie policy", href: "/cookies" },
    { label: "Terms of service", href: "/terms" },
  ] },
] as const;

export default function Nav() {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const close = () => { setOpen(null); setMobileOpen(false); };

  useEffect(close, [pathname]);
  useEffect(() => {
    if (!open && !mobileOpen) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[aria-modal="true"]')) return;
      const trigger = root.current?.querySelector<HTMLButtonElement>(
        open ? `[data-group="${open}"]` : '[aria-controls="site-navigation"]'
      );
      if (open) setOpen(null); else setMobileOpen(false);
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
  }, [open, mobileOpen]);

  function panelKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a, button"));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    event.preventDefault(); items[next]?.focus();
  }

  return <>
    <header className="dm-header">
      <nav ref={root} className={`dm-nav ${s.nav}`} aria-label="Main navigation">
        <Wordmark />
        <button type="button" className={s.mobileTrigger} aria-label="Navigation menu"
          aria-expanded={mobileOpen} aria-controls="site-navigation"
          onClick={() => { setMobileOpen(!mobileOpen); setOpen(null); }}>
          {mobileOpen ? "Close" : "Menu"}<span aria-hidden="true">{mobileOpen ? "×" : "+"}</span>
        </button>
        <div id="site-navigation" className={s.groups} data-open={mobileOpen}>
          {GROUPS.map(group => <div className={s.group} key={group.label}>
            <button type="button" className={s.trigger} data-group={group.label}
              aria-expanded={open === group.label} aria-controls={`nav-${group.label}`}
              onClick={() => setOpen(open === group.label ? null : group.label)}
              onKeyDown={event => {
                if (event.key === "ArrowDown") {
                  event.preventDefault(); setOpen(group.label);
                  requestAnimationFrame(() => document.getElementById(`nav-${group.label}`)?.querySelector<HTMLElement>("a, button")?.focus());
                }
              }}>
              {group.label}<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
            <div id={`nav-${group.label}`} className={s.panel} hidden={open !== group.label} onKeyDown={panelKeys}>
              <p>{group.caption}</p>
              {group.links.map(link => link.href === "feedback"
                ? <button type="button" className={s.link} key={link.href} onClick={() => {
                  root.current?.querySelector<HTMLButtonElement>(window.matchMedia("(max-width:1023px)").matches
                    ? '[aria-controls="site-navigation"]' : '[data-group="About"]')?.focus();
                  close(); setFeedback(true);
                }}><span>{link.label}</span><span aria-hidden="true">↗</span></button>
                : <Link key={link.href} className={s.link}
                    href={link.href === "/report" ? `/report?from=${encodeURIComponent(pathname)}` : link.href}
                    aria-current={pathname === link.href ? "page" : undefined} onClick={close}>
                    <span>{link.label}{"detail" in link && <small>{link.detail}</small>}</span><span aria-hidden="true">↗</span>
                  </Link>)}
            </div>
          </div>)}
        </div>
        <div className={s.actions}><HeaderCredits /><MotionToggle /><ProfileMenu /></div>
      </nav>
    </header>
    {feedback && <FeedbackDialog onClose={() => setFeedback(false)} />}
  </>;
}
