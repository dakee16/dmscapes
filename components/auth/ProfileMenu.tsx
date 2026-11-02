"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { headerCreditState, isPro, planLabel, planOf } from "@/lib/plan";
import { ChevronDown } from "@/components/ds/Icons";
import RollingNumber from "@/components/ds/RollingNumber";
import Avatar from "@/components/site/Avatar";
import { FeedbackDialog } from "@/components/site/FeedbackLink";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import { useHallFinderOn } from "@/components/hall-finder/useHallFinderOn";
import css from "@/components/site/HeaderMenus.module.css";

/**
 * The header account control. Logged out: "Log in". Logged in: in the site header,
 * the account capsule (designs left on a scrap of tape, then the avatar); in the
 * planner header, avatar + @username + chevron. Either opens the same menu: who you
 * are, designs left on a strip of tape (with Recharge), your rooms, account and billing,
 * help, feedback and the Motion switch, then Log out with the legal links. Closes on
 * outside click, Escape, and route change.
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
  const [feedback, setFeedback] = useState(false);
  const { paused, toggle: toggleMotion } = useExperienceMotion();
  const hallFinder = useHallFinderOn();
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

          {/* Design credits on a strip of tape. Recharge: Plus buys a top-up in the
              upgrade sheet; every other tier buys credits on the Billing page. */}
          {credit && (
            <div className={css.tape} data-empty={credit.empty || undefined}>
              <div className={css.tapeRow}>
                <span className={css.tapeLabel}>Designs left</span>
                <span className={css.tapeCount}>{credit.designsLeft}</span>
              </div>
              <div className={css.tapeFoot}>
                {isPro(profile) && <p className={css.tapeNote}>Switching between 2D and 3D uses no plan credits.</p>}
                {credit.plus ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      openUpgrade("plan-credits");
                    }}
                    className={css.tapeAction}
                  >
                    Recharge
                  </button>
                ) : (
                  <Link href="/account/billing" role="menuitem" onClick={() => setOpen(false)} className={css.tapeAction}>
                    Recharge
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className={css.items}>
            <Link href="/rooms" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              My designs
            </Link>
            <Link href="/my-room" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              My Room
            </Link>
            {hallFinder && (
              <Link href="/rooms#hall-finder" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
                My Hall Finder
              </Link>
            )}
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
                Room in 3D
                <span className={css.proTag}>Pro</span>
              </button>
            )}
          </div>

          <div className={css.items}>
            <Link href="/account/settings" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              Account settings
            </Link>
            <Link href="/account/billing" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              Billing
              {profile && <span className={css.itemNote}>{planLabel(profile)} plan</span>}
            </Link>
          </div>

          <div className={css.items}>
            <Link href="/faq" role="menuitem" onClick={() => setOpen(false)} className={css.item}>
              Help and FAQ
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setFeedback(true);
              }}
              className={css.item}
            >
              Send feedback
            </button>
            <button type="button" role="menuitemcheckbox" aria-checked={!paused} onClick={toggleMotion} className={`${css.item} ${css.motionItem}`}>
              <span className={css.motionText}>
                Motion
                <span>Animations across the site</span>
              </span>
              <span className={css.switch} aria-hidden="true" />
            </button>
          </div>

          <div className={css.menuFoot}>
            <button type="button" role="menuitem" onClick={handleLogout} disabled={loggingOut} className={css.logout}>
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
            <Link href="/privacy" role="menuitem" onClick={() => setOpen(false)} className={css.footLink}>
              Privacy
            </Link>
            <Link href="/terms" role="menuitem" onClick={() => setOpen(false)} className={css.footLink}>
              Terms
            </Link>
          </div>
        </div>
      )}
      {feedback && <FeedbackDialog onClose={() => setFeedback(false)} />}
    </div>
  );
}
