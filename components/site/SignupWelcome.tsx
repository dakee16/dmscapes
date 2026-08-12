"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPaid } from "@/lib/plan";
import { track } from "@/lib/analytics";
import { REVEAL_EASE } from "@/components/site/Reveal";

// The "start here" welcome for a brand-new account: a warm, once-ever hello that
// hands the student their one free design credit. Deliberately NOT the Plus
// upsell (PlusWelcome) or the reason-aware UpgradeModal; this is the friendly
// front door, shown before any paywall. It surfaces only for a free account
// that hasn't spent its free plan yet (free_plans_used === 0), and is suppressed
// permanently per account once seen (localStorage keyed by user id).
const seenKey = (uid: string) => `dormscape-signup-welcome-${uid}`;

export default function SignupWelcome() {
  const { user, profile, modalOpen } = useAuth();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  // Reveal once the account is known, the auth modal has closed (so it never
  // stacks on the login / username step), and this is a genuinely fresh free
  // account. localStorage is written the moment it shows, so a dismiss-by-
  // navigation still counts as "seen".
  useEffect(() => {
    if (open || !user || !profile || modalOpen) return;
    if (isPaid(profile)) return; // the free credit only means something on free
    if ((profile.free_plans_used ?? 0) !== 0) return; // already started designing
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(seenKey(user.id))) return;
    window.localStorage.setItem(seenKey(user.id), "1");
    setOpen(true);
    track("signup_welcome_shown");
  }, [open, user, profile, modalOpen]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    track("signup_welcome_dismissed");
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[3px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-welcome-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: REVEAL_EASE }}
        >
          <motion.div
            className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_40px_120px_-30px_rgba(23,23,43,0.55)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.34, ease: REVEAL_EASE }}
          >
        {/* Soft, friendly backdrop: graph-paper grid + a cobalt/highlight wash,
            distinct from the amber "premium" treatment of the Plus welcome. */}
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.5]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-paper/40 to-paper" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-cobalt/12 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-highlight/40 blur-3xl" aria-hidden="true" />

        <div className="relative p-7 sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-cobalt/25 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt">
              You&rsquo;re in
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <h2
            id="signup-welcome-title"
            className="mt-6 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[2.1rem]"
          >
            Welcome to <span className="hl">Dormscape.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            Here&rsquo;s your first design credit, on us. Pick your school, choose a
            vibe, and we&rsquo;ll lay out your room to the inch with a shoppable list
            that fits your budget.
          </p>

          {/* The credit, front and center. */}
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-cobalt/15 bg-cobalt/[0.05] p-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cobalt text-white">
              <span className="font-display text-2xl font-extrabold leading-none">1</span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">1 free design credit</p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                Enough to plan a full room, start to finish. No card needed.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/plan"
              onClick={() => {
                track("signup_welcome_cta_clicked");
                setOpen(false);
              }}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep"
            >
              Plan my room
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="h-12 shrink-0 cursor-pointer rounded-xl px-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Maybe later
            </button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
