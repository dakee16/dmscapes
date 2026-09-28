"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MotionToggle } from "@/components/experience/MotionProvider";
import { usePathname } from "next/navigation";
import ProfileMenu from "@/components/auth/ProfileMenu";
import Wordmark from "@/components/site/Wordmark";
import HeaderCredits from "@/components/site/HeaderCredits";

// Primary text nav, in reading order. Shown centered on desktop; on smaller
// widths these move into the overflow menu so the header stays uncrowded.
// Blog lives in the footer now; kept out of the primary header to stay uncrowded.
const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/colleges", label: "Colleges" },
  { href: "/rooms", label: "My rooms" },
] as const;

const NAV_LINK =
  "dm-nav-link text-sm font-medium text-ink-soft transition-colors hover:text-ink";

// Filled CTA style. The header's one high-priority action, kept visually
// distinct from the quieter text links and secondary items around it.
const PLAN_BTN =
  "dm-button dm-nav-cta";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const planCtaLabel = "Plan my room";

  // Overflow menu closes on outside click and Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Any route change leaves the menu closed.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Shared editorial navigation, including the native tier and account controls. */}
      <header className="dm-header">
        <nav aria-label="Main navigation" className="dm-nav">
          {/* Brand */}
          <Wordmark />

          {/* Primary nav, centered, desktop only. */}
          <div className="hidden items-center gap-7 lg:flex">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={NAV_LINK}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions: secondary items, the primary CTA, and the profile. */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* No standalone "Upgrade" link here: the tier-aware credits chip
                (HeaderCredits, below) already surfaces Upgrade/Recharge when it's
                relevant, so a second header CTA just duplicated it. Free users
                still get the "Upgrade to Plus" entry in the overflow menu. */}

            {/* The header's primary action. Below lg it moves into the overflow
                menu so the mobile header row never overflows the viewport. */}
            <a href="/plan" className={`hidden lg:inline-block ${PLAN_BTN}`}>
              {planCtaLabel}
            </a>

            {/* Overflow menu: nav links + secondary items, below the desktop
                breakpoint. Keeps everything one tap away without crowding. */}
            <div ref={menuRef} className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menu"
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-ink/12 bg-white text-ink transition-colors hover:border-ink/25"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  {menuOpen ? (
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  ) : (
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  )}
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Site menu"
                  className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-ink/10 bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(23,23,43,0.45)]"
                >
                  {/* Primary action, relocated here below lg so the header row
                      stays within the viewport. */}
                  <a
                    href="/plan"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="mb-1 flex items-center justify-center rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
                  >
                    {planCtaLabel}
                  </a>
                  <div className="pt-0.5">
                    {LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
                      >
                        {link.label}
                      </Link>
                    ))}

                  </div>


                </div>
              )}
            </div>

            {/* Live design-credits chip, just left of the avatar. Desktop only
                (md+); mobile uses the avatar badge + dropdown in ProfileMenu. */}
            <HeaderCredits />

            <MotionToggle />
            <ProfileMenu />
          </div>
        </nav>
      </header>
      {/* Outside <header>: its backdrop-filter would trap fixed positioning. */}
    </>
  );
}
