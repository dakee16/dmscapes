"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/ds/PageShell";
import { ArrowRight } from "@/components/ds/Icons";
import { getBrowserClient } from "@/lib/supabase-browser";
import { clearAuthParamsFromUrl } from "@/lib/auth-url";
import css from "@/components/account/reset.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    if (busy) return;
    if (!supabase) {
      setError("Password reset is temporarily unavailable. Please try again later.");
      return;
    }
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
    } catch {
      setError("Couldn't update your password. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (resending) return;
    if (!supabase) {
      setResendMsg("Password reset is temporarily unavailable. Please try again later.");
      return;
    }
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
    } catch {
      setResendMsg("Couldn't send a new link. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <PageShell>
      <div className={`ds-wrap ${css.wrap}`}>
        <div>
          <p className={css.eyebrow}>Reset password</p>

          {phase === "checking" && (
            <div className={css.skeleton} aria-busy="true" aria-label="Checking your reset link">
              <span />
              <span />
              <span />
            </div>
          )}

          {phase === "ready" && (
            <>
              <h1 className={css.title}>
                <b>Set a new</b>
                <i>password.</i>
              </h1>
              <p className={css.lede}>
                Pick something you&apos;ll remember. You&apos;ll be signed in right after.
              </p>
              <form onSubmit={handleSubmit} className={css.form} noValidate>
                <div>
                  <label htmlFor="rp-new" className="ds-label">
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
                    className="ds-input"
                  />
                </div>
                <div>
                  <label htmlFor="rp-confirm" className="ds-label">
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
                    className="ds-input"
                  />
                </div>
                {error && (
                  <p className={css.error} role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className="ds-btn ds-btn--ink-yellow">
                  {busy ? "Saving…" : "Save new password"}
                </button>
              </form>
            </>
          )}

          {phase === "done" && (
            <>
              <h1 className={css.title}>
                <b>Password</b>
                <i>updated.</i>
              </h1>
              <p className={css.lede}>You&apos;re all set and signed in.</p>
              <div className={css.actions}>
                <Link href="/account" className="ds-btn ds-btn--ink-yellow">
                  Your saved designs <ArrowRight />
                </Link>
                <Link href="/plan" className="ds-btn ds-btn--ghost-ink">
                  Plan a room
                </Link>
              </div>
            </>
          )}

          {phase === "expired" && (
            <>
              <h1 className={css.title}>
                <b>This link</b>
                <i>expired.</i>
              </h1>
              <p className={css.lede}>
                Reset links are single-use and time out fast. Enter your email and we&apos;ll send a fresh one.
              </p>
              <form onSubmit={handleResend} className={css.form} noValidate>
                <div>
                  <label htmlFor="rp-email" className="ds-label">
                    Email address
                  </label>
                  <input
                    id="rp-email"
                    type="email"
                    autoComplete="email"
                    value={resendEmail}
                    onChange={(e) => {
                      setResendEmail(e.target.value);
                      setResendMsg("");
                    }}
                    placeholder="you@school.edu"
                    className="ds-input"
                  />
                </div>
                {resendMsg && (
                  <p className={css.status} role="status">
                    {resendMsg}
                  </p>
                )}
                <button type="submit" disabled={resending} className="ds-btn ds-btn--ink-yellow">
                  {resending ? "Sending…" : "Send a new link"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className={css.art} data-reveal-img="load">
          <Image
            src="/redesign/site-login-door-hanger.jpg"
            alt="A yellow Dormscape door hanger on a brass knob: Planning in progress, knock later."
            fill
            quality={75}
            sizes="(min-width: 900px) 512px, 1px"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
          />
        </div>
      </div>
    </PageShell>
  );
}
