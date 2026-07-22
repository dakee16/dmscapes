"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * Header auth pill, sits just left of the ProfileButton.
 * Logged out: a highlighted "Log in" button that opens the shared auth modal
 * (the same trigger the profile icon uses — no second modal). Logged in: a
 * non-interactive username label in the same pill treatment; the profile icon
 * beside it owns the account menu, so the pill stays a plain label to avoid a
 * redundant second trigger. Hidden below sm so the tightest screens fall back
 * to the profile icon alone.
 */
export default function AuthPill() {
  const { user, profile, loading, openAuthModal } = useAuth();
  const signedIn = !loading && user !== null;

  const base =
    "hidden shrink-0 rounded-full bg-highlight px-3.5 py-1.5 text-sm font-semibold text-ink sm:inline-block";

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("profile")}
        className={`${base} cursor-pointer transition-colors hover:bg-amber`}
      >
        Log in
      </button>
    );
  }

  const label = profile?.username ? `@${profile.username}` : "Account";
  return (
    <span
      className={`${base} max-w-[9rem] truncate align-middle`}
      title={label}
      aria-label={`Signed in as ${label}`}
    >
      {label}
    </span>
  );
}
