"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isPlus } from "@/lib/plan";

function initialsOf(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  const at = clean.indexOf("@");
  const base = at > 0 ? clean.slice(0, at) : clean;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Shared far-right header profile control, used by both the main site header
 * (Nav) and the planner header (PlannerHeader). Logged out: a highlighted
 * "Log in" pill that opens the shared auth modal. Logged in: an avatar +
 * @username + chevron that toggles a dropdown (Account / Saved designs /
 * Log out). Replaced the old AuthPill + ProfileButton controls. Closes on
 * outside click, Escape, and route change.
 */
export default function ProfileMenu({
  onShowRoom3D,
}: {
  /** When provided, the dropdown gains a lower-priority "Room in 3D" item that
   *  opens the coming-soon teaser. The site header passes this; the planner
   *  header omits it. */
  onShowRoom3D?: () => void;
} = {}) {
  const { user, profile, loading, openAuthModal, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const signedIn = !loading && user !== null;

  // Close on outside click and Escape while open.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Navigating (via a menu Link) should always leave the menu closed.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("profile")}
        className="shrink-0 cursor-pointer rounded-full bg-highlight px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-amber"
      >
        Log in
      </button>
    );
  }

  const username = profile?.username ?? null;
  const display = username ?? user?.email ?? "account";
  const label = username ? `@${username}` : "Account";

  async function handleLogout() {
    setLoggingOut(true);
    setOpen(false);
    await signOut();
    router.replace("/");
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex cursor-pointer items-center gap-2 rounded-full border border-ink/12 bg-white py-1 pl-1 pr-2 transition-colors hover:border-ink/25"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] font-semibold text-white">
          {initialsOf(display)}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-ink sm:inline">
          {label}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-ink/10 bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(23,23,43,0.45)]"
        >
          {/* Identity header */}
          <div className="border-b border-ink/8 px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-ink">{label}</p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-ink-soft">{user.email}</p>
            )}
          </div>

          <div className="pt-1.5">
            {!isPlus(profile) && (
              <Link
                href="/pricing"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="mb-0.5 flex items-center gap-2.5 rounded-lg bg-cobalt/5 px-3 py-2 text-sm font-semibold text-cobalt transition-colors hover:bg-cobalt/10"
              >
                <span className="grid h-[18px] w-[18px] place-items-center font-display text-base font-extrabold leading-none">
                  +
                </span>
                Upgrade to Plus
              </Link>
            )}
            <Link
              href="/account/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px] text-ink-soft"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4.6 19.4c1.6-3 4.2-4.6 7.4-4.6s5.8 1.6 7.4 4.6" strokeLinecap="round" />
              </svg>
              Account
            </Link>
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px] text-ink-soft"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M6 4h12a1 1 0 0 1 1 1v14l-7-4-7 4V5a1 1 0 0 1 1-1z"
                  strokeLinejoin="round"
                />
              </svg>
              Saved designs
            </Link>
            {onShowRoom3D && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onShowRoom3D();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                <Crown />
                Room in 3D
                <span className="ml-auto rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
                  Soon
                </span>
              </button>
            )}
          </div>

          <div className="mt-1.5 border-t border-ink/8 pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#c2321e] transition-colors hover:bg-[#c2321e]/8 disabled:cursor-wait disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M15 12H5m0 0l3.5-3.5M5 12l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 5.5V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 19 5v14a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 11 19v-.5" strokeLinecap="round" />
              </svg>
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
