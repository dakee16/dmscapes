"use client";

import { useState } from "react";
import Link from "next/link";
import AuthPill from "@/components/auth/AuthPill";
import ProfileButton from "@/components/auth/ProfileButton";
import RoommateTeaser from "@/components/site/RoommateTeaser";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/colleges", label: "Colleges" },
  { href: "/blog", label: "Blog" },
] as const;

// Filled CTA style, shared by the desktop nav button and its mobile counterpart.
const PLAN_BTN =
  "rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cobalt";

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
        <div className="hidden items-center gap-6 text-sm font-medium text-ink-soft md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
          <a href="/plan" className={PLAN_BTN}>
            Plan my room
          </a>
          <button
            type="button"
            onClick={() => setTeaserOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink"
          >
            Room in 3D
            <span className="rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
              Soon
            </span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Mobile-only Plan CTA: the nav button above is desktop-only (md:flex). */}
          <a href="/plan" className={`${PLAN_BTN} md:hidden`}>
            Plan my room
          </a>
          <AuthPill />
          <ProfileButton />
        </div>
      </nav>
    </header>
    {/* Outside <header>: its backdrop-filter would trap fixed positioning. */}
    <RoommateTeaser open={teaserOpen} onClose={() => setTeaserOpen(false)} />
    </>
  );
}
