"use client";

import { useEffect, useRef, useState } from "react";
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

/** Header profile icon: opens the auth modal logged out, a dropdown logged in. */
export default function ProfileButton() {
  const { user, profile, loading, openAuthModal, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-ink font-mono text-xs font-semibold text-white transition-colors hover:bg-cobalt"
      >
        {initialsOf(display)}
      </button>
      {open && (
        <div className="snap-in absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-ink/10 bg-card p-1.5 shadow-md">
          <div className="px-3 pb-2 pt-2">
            <p className="truncate font-display text-sm font-bold tracking-tight">
              {profile?.username ? `@${profile.username}` : "Your account"}
            </p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-ink-soft">{user.email}</p>
            )}
          </div>
          <div className="my-1 h-px bg-ink/8" aria-hidden="true" />
          {!profile?.username && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openAuthModal("profile");
              }}
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              Pick a username
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
