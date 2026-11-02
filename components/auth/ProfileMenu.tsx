"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { headerCreditState, planLabel, planOf } from "@/lib/plan";
import { ChevronDown } from "@/components/ds/Icons";
import RollingNumber from "@/components/ds/RollingNumber";
import Avatar from "@/components/site/Avatar";
import css from "@/components/site/HeaderMenus.module.css";

function Crown() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.8 7.4l4 3 4.4-6a1 1 0 0 1 1.6 0l4.4 6 4-3a1 1 0 0 1 1.57 1l-1.6 8.9a1 1 0 0 1-1 .82H4.83a1 1 0 0 1-1-.82L2.24 8.4a1 1 0 0 1 1.56-1z" />
    </svg>
  );
}

/**
 * The header account control. Logged out: "Log in". Logged in: in the site header,
 * the account capsule (designs left on a scrap of tape, then the avatar); in the
 * planner header, avatar + @username + chevron. Either opens the same menu: designs
 * left, who you are, Account / My designs / Billing, Log out. Closes on outside
 * click, Escape, and route change.
 */
export default function ProfileMenu({
  onShowRoom3D,
  capsule = false,
}: {
  /** When provided, the dropdown gains a lower-priority "Room in 3D" item that
   *  opens the live 3D introduction. */
  onShowRoom3D?: () => void;
  /** The site header's account capsule (credits + avatar). */
  capsule?: boolean;
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
        className={capsule ? `ds-btn ds-btn--sm ds-btn--ghost-ink ${css.loginPill}` : `ds-login ${css.login}`}
      >
        Log in
      </button>
    );
  }

  const username = profile?.username ?? null;
  const display = username ?? user?.email ?? "account";
  const label = username ? `@${username}` : "Account";
  const avatar = profile?.avatar_url ?? null;
  // Tier-aware design credits: the capsule's tape, and the strip at the top of the menu.
  const credit = profile ? headerCreditState(profile) : null;
  const alert = credit?.show && credit.empty && <span className={css.alert} aria-label="Out of designs" role="img" />;

  async function handleLogout() {
    setLoggingOut(true);
    setOpen(false);
    await signOut();
    router.replace("/");
  }

  return (
    <div ref={rootRef} className={css.root} data-capsule={capsule || undefined}>
      {capsule ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={credit ? `Account menu, ${credit.designsLeft} design${credit.designsLeft === 1 ? "" : "s"} left` : "Account menu"}
          className={css.capsule}
          data-empty={credit?.empty || undefined}
        >
          {credit && <RollingNumber value={String(credit.designsLeft)} className={css.count} />}
          <span className={css.capsuleAvatar}>
            <Avatar className={css.avatar} src={avatar} name={display} />
            {alert}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className={css.trigger}
        >
          <span className={css.capsuleAvatar}>
            <Avatar className={css.avatar} src={avatar} name={display} />
            {/* Phone-only: out of designs (the planner header has no credits tape). */}
            {alert}
          </span>
          <span className={css.name}>{label}</span>
          <span className={css.chev} aria-hidden="true"><ChevronDown size={14} /></span>
        </button>
      )}

      {open && (
        <div role="menu" aria-label="Account" className={`${css.pop} ${css.menu}`}>
          {/* Design credits: first and most prominent, on a strip of tape. At zero
              it becomes the Recharge/Upgrade action. */}
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
                  <Link href="/account/billing" onClick={() => setOpen(false)} className={css.tapeAction}>
                    Buy credits
                  </Link>
                ))}
            </div>
          )}

          {/* Identity header, with the current tier (and Creator) as badges. */}
          <div className={css.who}>
            <Avatar className={`${css.avatar} ${css.avatarLg}`} src={avatar} name={display} />
            <div className={css.whoText}>
              <p className={css.whoName}>
                <span>{label}</span>
                {profile && (
                  <span className={css.tier} data-tier={planOf(profile.plan)}>{planLabel(profile)}</span>
                )}
                {profile?.creator_at && <span className={css.tier} data-tier="creator">Creator</span>}
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
