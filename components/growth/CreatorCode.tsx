"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Modal from "@/components/site/Modal";
import { ArrowRight } from "@/components/ds/Icons";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";
import { REVEAL_EASE } from "@/components/site/Reveal";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { bearer, captureArrival, forgetCreatorCode, storedCreatorCode } from "@/lib/invites";
import { isPaid, PLUS_INITIAL_CREDITS } from "@/lib/plan";
import g from "./Growth.module.css";

const MotionModal = motion.create(Modal);

// Creator codes unlock Plus free (lib/creator-codes.ts). A creator's link (/c/CODE)
// opens this dialog with the code filled in; "Have a creator code?" opens it empty.
const OPEN_EVENT = "dormscape:creator-code";
const LATER_KEY = "dormscape-creator-after-auth";
const QUIET = /^\/(login|reset-password)(\/|$)/;

export const RedeemCodeButton = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
    {children}
  </button>
);

/** Type a code, unlock Plus. Signed-in only (the dialog and Billing check first). */
export function CreatorCodeForm({ initial = "", from }: { initial?: string; from: string }) {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!code.trim()) {
      setError("Enter your creator code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await bearer();
      if (!token) {
        setError("Sign in to use a creator code.");
        return;
      }
      const res = await fetch("/api/creator-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) {
        forgetCreatorCode();
        setDone(true);
        track("creator_code_redeemed", { from });
        await refreshProfile();
      } else {
        // A code that can't work for this account is dropped, so the dialog doesn't come back for it.
        if (res.status !== 429 && res.status < 500) forgetCreatorCode();
        setError(data?.error ?? "Couldn't use that code. Try again in a minute.");
        track("creator_code_failed", { from, status: res.status });
      }
    } catch {
      setError("Couldn't reach dormscape. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={g.done} role="status">
        <p style={{ margin: 0 }}>
          <b>Plus is unlocked.</b> You have {PLUS_INITIAL_CREDITS} new plan credits and every Plus tool.
        </p>
        <Link href="/plan" className={g.textBtn}>
          Plan a room
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className={g.invite} noValidate>
      <div className={g.row}>
        <input
          className="ds-input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          placeholder="Creator code"
          aria-label="Creator code"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `creator-code-error-${from}` : undefined}
        />
        <button type="submit" className="ds-btn ds-btn--ink-yellow" disabled={busy}>
          {busy ? "Checking…" : "Unlock Plus"}
        </button>
      </div>
      {error && (
        <p id={`creator-code-error-${from}`} className={g.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function CreatorCode() {
  const { user, profile, loading, openAuthModal } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const reduce = useReducedMotion();

  // Remember invites and creator codes from the address, on every page.
  useEffect(() => {
    captureArrival();
  }, [pathname]);

  // A creator link opens the dialog. Signed-out visitors keep the code through sign-up.
  useEffect(() => {
    if (loading || open || QUIET.test(pathname)) return;
    const stored = storedCreatorCode();
    if (!stored || (user && !profile)) return;
    if (isPaid(profile)) {
      forgetCreatorCode(); // nothing to unlock
      return;
    }
    try {
      if (!user && window.sessionStorage.getItem(LATER_KEY)) return;
    } catch {
      // No session storage: ask again.
    }
    setCode(stored);
    setOpen(true);
    track("creator_code_opened", { via: "link" });
  }, [loading, user, profile, pathname, open]);

  useEffect(() => {
    const show = () => {
      setCode(storedCreatorCode() ?? "");
      setOpen(true);
      track("creator_code_opened", { via: "button" });
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function close() {
    forgetCreatorCode();
    setOpen(false);
  }

  function signUp() {
    try {
      window.sessionStorage.setItem(LATER_KEY, "1");
    } catch {
      // The code is still remembered for after sign-in.
    }
    setOpen(false);
    openAuthModal("profile");
  }

  return (
    <AnimatePresence>
      {open && (
        <MotionModal
          className={`${d.layer} ${d.quiet}`}
          style={{ "--z": 66 } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-code-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: REVEAL_EASE }}
        >
          <motion.div
            className={`ds ${d.sheet} ${d.quiet}`}
            style={{ "--w": "480px" } as React.CSSProperties}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.34, ease: REVEAL_EASE }}
          >
            <div className={d.top}>
              <span className={d.mark} aria-hidden="true">
                dormscape<i />
              </span>
              <CloseButton onClick={close} />
            </div>
            <h2 id="creator-code-title" className={d.title}>
              Unlock Plus, <span className={d.serif}>free.</span>
            </h2>
            {user ? (
              <>
                <p className={d.body}>
                  A creator code unlocks Plus at no cost: {PLUS_INITIAL_CREDITS} plan credits and every Plus tool. One code per
                  account.
                </p>
                <CreatorCodeForm initial={code} from="dialog" />
              </>
            ) : (
              <>
                <p className={d.body}>
                  Sign up free, or log in, then use {code ? <b>{code.toUpperCase()}</b> : "your code"} to unlock Plus at no
                  cost: {PLUS_INITIAL_CREDITS} plan credits and every Plus tool.
                </p>
                <div className={d.row}>
                  <button type="button" onClick={signUp} className={`${d.btn} ${d.btnInk}`}>
                    Sign up to claim <ArrowRight />
                  </button>
                  <button type="button" onClick={close} className={d.later} style={{ width: "auto", margin: 0 }}>
                    Maybe later
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </MotionModal>
      )}
    </AnimatePresence>
  );
}
