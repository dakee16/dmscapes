"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function initialsOf(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  const at = clean.indexOf("@");
  const base = at > 0 ? clean.slice(0, at) : clean;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/**
 * Header profile control. Logged out: opens the auth modal. Logged in: links to
 * the full /account page (the account menu now lives on that page, including
 * logout), so this is a straight navigation, not a dropdown.
 */
export default function ProfileButton() {
  const { user, profile, loading, openAuthModal } = useAuth();
  const signedIn = !loading && user !== null;

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("profile")}
        aria-label="Log in or sign up"
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-ink/15 bg-white text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="8.2" r="3.6" />
          <path d="M4.8 19.4c1.7-2.9 4.2-4.4 7.2-4.4s5.5 1.5 7.2 4.4" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  const display = profile?.username ?? user?.email ?? "account";

  return (
    <Link
      href="/account"
      aria-label="Your account"
      className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-ink font-mono text-xs font-semibold text-white transition-colors hover:bg-cobalt"
    >
      {initialsOf(display)}
    </Link>
  );
}
