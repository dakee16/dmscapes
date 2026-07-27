"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

/**
 * Header auth pill, sits just left of the ProfileButton.
 * Logged out: a highlighted "Log in" button that opens the shared auth modal
 * (the same trigger the profile icon uses, no second modal). Logged in: the
 * @username as a link to the full /account page (same destination as the
 * profile icon). Hidden below sm so the tightest screens fall back to the
 * profile icon alone.
 */
export default function AuthPill() {
  const { user, profile, loading, openAuthModal } = useAuth();
  const signedIn = !loading && user !== null;

  const base =
    "hidden shrink-0 rounded-full bg-highlight px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-amber sm:inline-block";

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("profile")}
        className={`${base} cursor-pointer`}
      >
        Log in
      </button>
    );
  }

  const label = profile?.username ? `@${profile.username}` : "Account";
  return (
    <Link
      href="/account"
      title={label}
      aria-label={`Your account (${label})`}
      className={`${base} max-w-[9rem] truncate align-middle`}
    >
      {label}
    </Link>
  );
}
