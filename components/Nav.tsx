"use client";

import { useState } from "react";
import Link from "next/link";
import ProfileMenu from "@/components/auth/ProfileMenu";
import RoommateTeaser from "@/components/site/RoommateTeaser";

// Text nav links, split around the "Plan my room" CTA so the header reads
// Home, Colleges, Blog, Plan my room, Pricing, Contact left to right.
const LINKS_BEFORE = [
  { href: "/", label: "Home" },
  { href: "/colleges", label: "Colleges" },
  { href: "/blog", label: "Blog" },
] as const;

const LINKS_AFTER = [
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

const NAV_LINK =
  "text-sm font-medium text-ink-soft transition-colors hover:text-ink";

// Filled CTA style, shared by the desktop nav button and its mobile counterpart.
const PLAN_BTN =
  "shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cobalt";

function Crown() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0 text-amber"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.8 7.4l4 3 4.4-6a1 1 0 0 1 1.6 0l4.4 6 4-3a1 1 0 0 1 1.57 1l-1.6 8.9a1 1 0 0 1-1 .82H4.83a1 1 0 0 1-1-.82L2.24 8.4a1 1 0 0 1 1.56-1z" />
    </svg>
  );
}

export default function Nav() {
  const [teaserOpen, setTeaserOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="shrink-0" aria-label="Dormscape home">
            <span className="font-display text-lg font-bold tracking-tight">
              dorm<span className="text-amber">scape</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            {/* Text nav, desktop only. Plan CTA sits between the two groups. */}
            <div className="hidden items-center gap-6 md:flex">
              {LINKS_BEFORE.map((link) => (
                <Link key={link.href} href={link.href} className={NAV_LINK}>
                  {link.label}
                </Link>
              ))}
            </div>

            <a href="/plan" className={PLAN_BTN}>
              Plan my room
            </a>

            <div className="hidden items-center gap-6 md:flex">
              {LINKS_AFTER.map((link) => (
                <Link key={link.href} href={link.href} className={NAV_LINK}>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Room in 3D: premium teaser, sits just before the profile. Crown
                stays on every width; the label + badge collapse on mobile. */}
            <button
              type="button"
              onClick={() => setTeaserOpen(true)}
              title="Room in 3D, coming soon"
              className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              <Crown />
              <span className="hidden sm:inline">Room in 3D</span>
              <span className="hidden rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink sm:inline-block">
                Soon
              </span>
            </button>

            <ProfileMenu />
          </div>
        </nav>
      </header>
      {/* Outside <header>: its backdrop-filter would trap fixed positioning. */}
      <RoommateTeaser open={teaserOpen} onClose={() => setTeaserOpen(false)} />
    </>
  );
}
