"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { headerCreditState, planLabel, planOf } from "@/lib/plan";
import { ChevronDown } from "@/components/ds/Icons";
import css from "@/components/site/HeaderMenus.module.css";

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
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.8 7.4l4 3 4.4-6a1 1 0 0 1 1.6 0l4.4 6 4-3a1 1 0 0 1 1.57 1l-1.6 8.9a1 1 0 0 1-1 .82H4.83a1 1 0 0 1-1-.82L2.24 8.4a1 1 0 0 1 1.56-1z" />
    </svg>
  );
}

/**
 * Far-right header profile control, part of the shared site header (Nav), which
 * now renders on every page including the planner flow. Logged out: a highlighted
 * "Log in" pill that opens the shared auth modal. Logged in: an avatar +
 * @username + chevron that toggles a dropdown (Account / Saved designs /
 * Log out). Replaced the old AuthPill + ProfileButton controls. Closes on
 * outside click, Escape, and route change.
 */
export default function ProfileMenu({
  onShowRoom3D,
}: {
  /** When provided, the dropdown gains a lower-priority "Room in 3D" item that
   *  opens the live 3D introduction. The site header passes this; the planner
   *  header omits it. */
  onShowRoom3D?: () => void;
} = {}) {
  const { user, profile, loading, openAuthModal, signOut } = useAuth();
  const { openUpgrade } = useUpgrade();
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
        className={`ds-login ${css.login}`}
      >
        Log in
      </button>
    );
  }

  const username = profile?.username ?? null;
  const display = username ?? user?.email ?? "account";
  const label = username ? `@${username}` : "Account";
  // Tier-aware design credits (free + plus). Drives the mobile avatar badge and
  // the prominent credits block at the top of the dropdown.
  const credit = profile ? headerCreditState(profile) : null;

  async function handleLogout() {
    setLoggingOut(true);
    setOpen(false);
    await signOut();
    router.replace("/");
  }

  return (
    <div ref={rootRef} className={css.root}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={css.trigger}
      >
        <span className={css.avatar}>
          {initialsOf(display)}
          {/* Phone-only notification badge: something needs attention (out of
              designs). Wider screens show the state via the header chip instead. */}
          {credit?.show && credit.empty && (
            <span className={css.alert} aria-label="Out of designs" role="img" />
          )}
        </span>
        <span className={css.name}>{label}</span>
        <span className={css.chev} aria-hidden="true"><ChevronDown size={14} /></span>
      </button>

      {open && (
        <div role="menu" aria-label="Account" className={`${css.pop} ${css.menu}`}>
          {/* Design credits: first and most prominent, on a strip of tape. Free
              + Plus see a live count; at zero it becomes the Recharge/Upgrade
              action. Saving is unlimited, so there is no saves counter. */}
          {credit && (
            <div className={css.tape}>
              <div className={css.tapeRow}>
                <span className={css.tapeLabel}>Designs left</span>
                <span className={css.tapeCount}>{credit.designsLeft}</span>
              </div>
              {credit.empty &&
                (credit.plus ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openUpgrade("plan-credits");
                    }}
                    className={css.tapeAction}
                  >
                    Recharge designs
                  </button>
                ) : (
                  // Free and Flex buy à-la-carte credits on the Billing page.
                  <Link
                    href="/account/billing"
                    onClick={() => setOpen(false)}
                    className={css.tapeAction}
                  >
                    Buy credits
                  </Link>
                ))}
            </div>
          )}

          {/* Identity header, with the current tier shown as a distinct badge. */}
          <div className={css.who}>
            <span className={`${css.avatar} ${css.avatarLg}`} aria-hidden="true">{initialsOf(display)}</span>
            <div className={css.whoText}>
              <p className={css.whoName}>
                <span>{label}</span>
                {profile && (
                  <span className={css.tier} data-tier={planOf(profile.plan)}>{planLabel(profile)}</span>
                )}
              </p>
              {user?.email && <p className={css.whoEmail}>{user.email}</p>}
            </div>
          </div>

          <div className={css.items}>
            <Link href="/account/settings" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4.6 19.4c1.6-3 4.2-4.6 7.4-4.6s5.8 1.6 7.4 4.6" strokeLinecap="round" />
              </svg>
              Account
            </Link>
            <Link href="/rooms" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 4h12a1 1 0 0 1 1 1v14l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
              </svg>
              My designs
            </Link>
            <Link href="/account/billing" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" strokeLinecap="round" />
              </svg>
              Billing
            </Link>
            {onShowRoom3D && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onShowRoom3D();
                }}
                className={css.item}
              >
                <Crown />
                Room in 3D
                <span className={css.proTag}>Pro</span>
              </button>
            )}
          </div>

          <div className={css.items}>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`${css.item} ${css.logout}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
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
