"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import { getBrowserClient } from "@/lib/supabase-browser";
import { clearAuthParamsFromUrl } from "@/lib/auth-url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INPUT =
  "h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt";

/**
 * Where the emailed reset link lands. Supabase's link establishes a short-lived
 * recovery session on arrival (the browser client detects it in the URL); with
 * that session we let the user set a new password via updateUser. If no session
 * shows up, the link was invalid or expired and we offer to send a fresh one.
 */
type Phase = "checking" | "ready" | "expired" | "done";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // "Send a fresh link" fallback (shown when the link is expired/invalid).
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const settledRef = useRef(false);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      setPhase("expired");
      return;
    }

    function markReady() {
      if (settledRef.current) return;
      settledRef.current = true;
      // The recovery session is now in memory; strip the #access_token the
      // reset link left in the address bar. Safe here (session already read).
      clearAuthParamsFromUrl();
      setPhase("ready");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) markReady();
    });

    // The recovery session should arrive within a beat; if it never does, the
    // link was bad or already used.
    const t = setTimeout(() => {
      if (!settledRef.current) setPhase("expired");
    }, 3500);

    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || busy) return;
    if (password.length < 6) {
      setError("Password needs at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || resending) return;
    const mail = resendEmail.trim();
    if (!EMAIL_RE.test(mail)) {
      setResendMsg("That email doesn't look right.");
      return;
    }
    setResending(true);
    setResendMsg("");
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Don't reveal whether the address exists; always confirm.
      setResendMsg(
        err ? err.message : `If ${mail} has an account, a new link is on its way.`
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          Reset password
        </p>

        {phase === "checking" && (
          <div className="mt-3" aria-busy="true" aria-label="Checking your reset link">
            <div className="h-9 w-56 animate-pulse rounded-lg bg-ink/8" />
            <div className="mt-6 h-40 animate-pulse rounded-2xl bg-ink/8" />
          </div>
        )}

        {phase === "ready" && (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              Set a new password
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              Pick something you&apos;ll remember. You&apos;ll be signed in right
              after.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="rp-new" className="mb-1.5 block text-sm font-medium">
                  New password
                </label>
                <input
                  id="rp-new"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="6+ characters"
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="rp-confirm" className="mb-1.5 block text-sm font-medium">
                  Confirm new password
                </label>
                <input
                  id="rp-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError("");
                  }}
                  placeholder="Re-enter the new password"
                  className={INPUT}
                />
              </div>
              {error && (
                <p className="text-sm text-[#c2321e]" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </form>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              Password updated
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              You&apos;re all set and signed in.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/account"
                className="inline-flex h-12 items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
              >
                Your saved designs
              </Link>
              <Link
                href="/plan"
                className="inline-flex h-12 items-center rounded-xl border border-ink/15 bg-white px-6 text-sm font-semibold text-ink transition-colors hover:border-ink/30"
              >
                Plan a room
              </Link>
            </div>
          </>
        )}

        {phase === "expired" && (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              This link expired
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Reset links are single-use and time out fast. Enter your email and
              we&apos;ll send a fresh one.
            </p>
            <form onSubmit={handleResend} className="mt-6 space-y-4" noValidate>
              <input
                type="email"
                autoComplete="email"
                value={resendEmail}
                onChange={(e) => {
                  setResendEmail(e.target.value);
                  setResendMsg("");
                }}
                placeholder="you@school.edu"
                className={INPUT}
                aria-label="Email address"
              />
              {resendMsg && (
                <p className="font-mono text-xs text-ink-soft" role="status">
                  {resendMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={resending}
                className="h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
              >
                {resending ? "Sending…" : "Send a new link"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
