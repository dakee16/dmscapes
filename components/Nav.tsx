"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileMenu from "@/components/auth/ProfileMenu";
import Wordmark from "@/components/site/Wordmark";
import RoommateTeaser from "@/components/site/RoommateTeaser";
import HeaderCredits from "@/components/site/HeaderCredits";
import { useAuth } from "@/lib/auth-context";
import { isFree } from "@/lib/plan";

// Primary text nav, in reading order. Shown centered on desktop; on smaller
// widths these move into the overflow menu so the header stays uncrowded.
// Blog lives in the footer now; kept out of the primary header to stay uncrowded.
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/colleges", label: "Colleges" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

const NAV_LINK =
  "text-sm font-medium text-ink-soft transition-colors hover:text-ink";

// Filled CTA style. The header's one high-priority action, kept visually
// distinct from the quieter text links and secondary items around it.
const PLAN_BTN =
  "shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-6px_rgba(23,23,43,0.5)] transition-all duration-200 hover:bg-cobalt active:translate-y-px";

function Crown({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0 text-amber`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.8 7.4l4 3 4.4-6a1 1 0 0 1 1.6 0l4.4 6 4-3a1 1 0 0 1 1.57 1l-1.6 8.9a1 1 0 0 1-1 .82H4.83a1 1 0 0 1-1-.82L2.24 8.4a1 1 0 0 1 1.56-1z" />
    </svg>
  );
}

function SoonBadge() {
  return (
    <span className="rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
      Soon
    </span>
  );
}

export default function Nav() {
  const [teaserOpen, setTeaserOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { profile } = useAuth();
  // Free accounts (and logged-out visitors) see the upgrade entry; Plus shows
  // the "+" indicator and Pro the "PRO" badge on the wordmark instead.
  const showUpgrade = isFree(profile);

  // Overflow menu closes on outside click and Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
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
      {/* Floating "island" header: the sticky wrapper adds side + top margin so
          the bar never sits flush to the viewport edges; the nav itself is the
          rounded, translucent, blurred pill that hovers over the page as it
          scrolls. */}
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-4 rounded-full border border-ink/10 bg-paper/80 px-4 shadow-[0_12px_34px_-14px_rgba(23,23,43,0.4)] backdrop-blur-md sm:h-[68px] sm:px-6">
          {/* Brand */}
          <Wordmark />

          {/* Primary nav, centered, desktop only. */}
          <div className="hidden items-center gap-7 lg:flex">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={NAV_LINK}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions: secondary items, the primary CTA, and the profile. */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Upgrade to Plus: the primary header-level upgrade entry for free
                users, cobalt-tinted so it reads clearly without competing with
                the solid "Plan my room" CTA. Plus members see no button here;
                their status shows as the "+" on the wordmark. Desktop only; on
                smaller widths it lives in the overflow menu. */}
            {showUpgrade && (
              <Link
                href="/pricing"
                className="hidden shrink-0 text-sm font-medium text-cobalt transition-colors hover:text-cobalt-deep lg:inline-block"
              >
                Upgrade
              </Link>
            )}

            {/* The header's primary action. Below lg it moves into the overflow
                menu so the mobile header row never overflows the viewport. */}
            <a href="/plan" className={`hidden lg:inline-block ${PLAN_BTN}`}>
              Try for FREE
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
                    Plan my room
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

                  <div className="mt-1.5 border-t border-ink/8 pt-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setTeaserOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
                    >
                      <Crown className="h-[18px] w-[18px]" />
                      Room in 3D
                      <span className="ml-auto">
                        <SoonBadge />
                      </span>
                    </button>

                    {showUpgrade && (
                      <Link
                        href="/pricing"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="mt-0.5 flex items-center gap-2.5 rounded-lg bg-cobalt/5 px-3 py-2 text-sm font-semibold text-cobalt transition-colors hover:bg-cobalt/10"
                      >
                        <span className="grid h-[18px] w-[18px] place-items-center font-display text-base font-extrabold leading-none">
                          +
                        </span>
                        Upgrade to Plus
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live design-credits chip, just left of the avatar. Desktop only
                (md+); mobile uses the avatar badge + dropdown in ProfileMenu. */}
            <HeaderCredits />

            <ProfileMenu onShowRoom3D={() => setTeaserOpen(true)} />
          </div>
        </nav>
      </header>
      {/* Outside <header>: its backdrop-filter would trap fixed positioning. */}
      <RoommateTeaser open={teaserOpen} onClose={() => setTeaserOpen(false)} />
    </>
  );
}
