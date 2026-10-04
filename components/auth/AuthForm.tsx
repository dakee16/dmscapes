"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useAuth, type AuthModalReason } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { passwordMeetsPolicy } from "@/lib/password";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import styles from "./Auth.module.css";

type Mode = "login" | "signup";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// See lib/auth-context: auth network calls can hang and never settle; the busy
// flag is cleared in `finally`, which only runs once the awaited promise settles.
// Race every call against a timeout so the button always recovers.
const AUTH_TIMEOUT_MS = 15000;
function withTimeout<T>(promise: Promise<T>, ms = AUTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const e = new Error("Request timed out");
        e.name = "TimeoutError";
        reject(e);
      }, ms);
    }),
  ]);
}
const SLOW_NETWORK_MSG =
  "This is taking longer than expected. Check your connection and try again.";

function isAlreadyRegistered(err: { code?: string | null; message?: string | null }): boolean {
  const code = (err.code ?? "").toLowerCase();
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    /already registered|already exists|already been registered/.test(msg)
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.87 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

/** Two-voice title: the last word in Fraunces italic, blue (Login.dc.html). */
function Title({ text }: { text: string }) {
  const cut = text.lastIndexOf(" ");
  const lead = cut > 0 ? text.slice(0, cut) : "";
  const last = cut > 0 ? text.slice(cut + 1) : text;
  return (
    <h1 className={styles.title}>
      {lead && <><span className={styles.titleLead}>{lead}</span> </>}
      <span className={styles.titleSerif}>{last}.</span>
    </h1>
  );
}

/**
 * The email/password + Google auth form. Extracted from the old AuthModal and
 * adapted for the dedicated /login page: on a completed auth it navigates to
 * `next` instead of closing an overlay. `reason` tailors the copy for the flow
 * that sent the user here (design gate, buy, save, or a plain login). The
 * post-auth username claim + welcome are handled globally (UsernamePrompt /
 * SignupWelcome), so they sequence correctly after landing on `next`.
 */
export default function AuthForm({
  reason = "profile",
  next = "/plan",
}: {
  reason?: AuthModalReason;
  next?: string;
}) {
  const { configured, user, profile } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [existingNotice, setExistingNotice] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Already signed in (e.g. landed here with a session, or auth just completed):
  // leave the login page and resume wherever they were headed.
  useEffect(() => {
    if (user && profile?.username) router.replace(next);
  }, [user, profile, next, router]);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  function switchToExistingAccount() {
    setMode("login");
    setPassword("");
    setAgreed(false);
    setConfirmSent(false);
    setError("");
    setExistingNotice(true);
    setTimeout(() => document.getElementById("auth-password")?.focus(), 80);
  }

  async function handleGoogle() {
    const supabase = getBrowserClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    window.localStorage.setItem("dormscape-oauth-pending", "1");
    try {
      const { error: err } = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider: "google",
          // Return straight to where the user was headed after the round-trip.
          options: { redirectTo: `${window.location.origin}${next}` },
        })
      );
      if (err) {
        window.localStorage.removeItem("dormscape-oauth-pending");
        setError(err.message);
        setBusy(false);
      }
      // On success the browser navigates away.
    } catch {
      window.localStorage.removeItem("dormscape-oauth-pending");
      setError(SLOW_NETWORK_MSG);
      setBusy(false);
    }
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || busy) return;
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setError("That email doesn't look right.");
      return;
    }
    if (mode === "signup") {
      if (!agreed) {
        setError("Please agree to the Terms of Service and Privacy Policy to continue.");
        return;
      }
      if (!passwordMeetsPolicy(password)) {
        setError("Password needs 8 to 12 characters, an uppercase letter, and a special character.");
        return;
      }
    } else if (password.length < 6) {
      setError("Password needs at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: err } = await withTimeout(
          supabase.auth.signUp({
            email: mail,
            password,
            options: { data: { terms_accepted_at: new Date().toISOString() } },
          })
        );
        if (err) {
          if (isAlreadyRegistered(err)) {
            switchToExistingAccount();
            return;
          }
          setError(err.message);
          return;
        }
        // Email-enumeration protection: an existing account returns a decoy user
        // with an empty identities array and no error. Treat it like "already
        // registered".
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          switchToExistingAccount();
          return;
        }
        track("auth_completed", { mode: "signup", provider: "email" });
        // No session => email confirmation is on; otherwise the auth listener
        // fires, the profile loads, and the redirect effect lands them on `next`.
        if (!data.session) setConfirmSent(true);
      } else {
        const { error: err } = await withTimeout(
          supabase.auth.signInWithPassword({ email: mail, password })
        );
        if (err) {
          setError(err.message);
          return;
        }
        track("auth_completed", { mode: "login", provider: "email" });
        // Session lands via the auth listener; the redirect effect handles `next`.
      }
    } catch {
      setError(SLOW_NETWORK_MSG);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || busy) return;
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setError("That email doesn't look right.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: err } = await withTimeout(
        supabase.auth.resetPasswordForEmail(mail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      );
      if (err) {
        setError(err.message);
        return;
      }
      setResetSent(true);
    } catch {
      setError(SLOW_NETWORK_MSG);
    } finally {
      setBusy(false);
    }
  }

  const saveDesign = reason === "save-design";
  const buyReason = reason === "buy";
  const generateReason = reason === "generate";
  const signupBlocked = mode === "signup" && !agreed;

  const title = confirmSent
    ? "Check your inbox"
    : resetMode
      ? resetSent
        ? "Check your inbox"
        : "Reset your password"
      : saveDesign
        ? "Save your design"
        : buyReason
          ? "Sign in to shop"
          : generateReason
            ? "Sign in to design"
            : mode === "signup" ? "Create your account" : "Welcome back";

  if (!configured) {
    return (
      <div className={styles.form}>
        <Title text="Sign-in is unavailable" />
        <div className={styles.note}>
          <p>Please try again later. You can still explore schools, room sizes, and styles.</p>
          <Link href="/plan" className={`ds-btn ds-btn--ink-yellow ${styles.submit}`}>
            Start planning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <Title text={title} />

      {confirmSent ? (
        <div className={styles.note}>
          <p><strong>We sent a confirmation link to {email.trim()}.</strong></p>
          <p>Open the link, then log in.</p>
          <button
            type="button"
            onClick={() => {
              setConfirmSent(false);
              setMode("login");
            }}
            className={`ds-btn ds-btn--ink-yellow ${styles.submit}`}
          >
            Back to log in
          </button>
        </div>
      ) : resetMode ? (
        resetSent ? (
          <div className={styles.note}>
            <p><strong>If {email.trim()} has an account, a reset link is on its way.</strong></p>
            <p>Open the link to choose a new password.</p>
            <button
              type="button"
              onClick={() => { setResetMode(false); setResetSent(false); }}
              className={`ds-btn ds-btn--ink-yellow ${styles.submit}`}
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} noValidate>
            <p className={styles.intro}>Enter your email and we&apos;ll send a link to set a new password.</p>
            <div className={`${styles.fields} ${styles.solo}`}>
              <div className={styles.field}>
                <label htmlFor="auth-reset-email" className={styles.label}>Email</label>
                <input id="auth-reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" className={styles.input} />
              </div>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button type="submit" disabled={busy} className={`ds-btn ds-btn--ink-yellow ${styles.submit}`}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <button type="button" onClick={() => { setResetMode(false); setError(""); }} className={styles.back}>
                Back to log in
              </button>
            </div>
          </form>
        )
      ) : (
        <div>
          <p className={styles.intro}>
            {saveDesign
              ? "Create a free account to keep this room."
              : buyReason
                ? "Sign in and we'll send you to Amazon. Your room stays exactly as it is."
                : generateReason
                  ? "Create a free account to generate your room. Your choices are saved, so you can pick up right here."
                  : "Save your designs, revisit your favorites, and pick up where you left off."}
          </p>
          <div className={styles.tabs} role="group" aria-label="Account access">
            {(["signup", "login"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setError(""); setExistingNotice(false); }} className={styles.tab}>
                {m === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>
          {mode === "login" && existingNotice && (
            <div className={styles.notice} role="status">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>
                <strong>An account with this email already exists.</strong>{" "}
                We switched you to log in{email.trim() ? ", " : "."}
                {email.trim() && (<>just enter your password for <strong>{email.trim()}</strong>.</>)}
              </p>
            </div>
          )}
          <button type="button" onClick={handleGoogle} disabled={busy} className={styles.google}>
            <GoogleG /> Continue with Google
          </button>
          <div className={styles.or} aria-hidden="true">OR</div>
          <form onSubmit={handleCredentials} className={styles.fields} noValidate>
            <div className={styles.field}>
              <label htmlFor="auth-email" className={styles.label}>Email</label>
              <input ref={emailRef} id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (existingNotice) setExistingNotice(false); }} placeholder="you@school.edu" className={styles.input} />
            </div>
            <div className={styles.field}>
              <span className={styles.labelRow}>
                <label htmlFor="auth-password" className={styles.label}>Password</label>
                {mode === "login" && (
                  <button type="button" onClick={() => { setResetMode(true); setError(""); }} className={styles.textBtn}>
                    Forgot password?
                  </button>
                )}
              </span>
              <input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "8 to 12 characters" : "Your password"} className={styles.input} />
              {mode === "signup" && <PasswordChecklist password={password} />}
            </div>
            {mode === "signup" && (
              <div className={styles.consent}>
                <input id="auth-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-label="I agree to the Terms of Service and Privacy Policy" />
                <p>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
                </p>
              </div>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button type="submit" disabled={busy || signupBlocked} aria-disabled={busy || signupBlocked} data-blocked={signupBlocked} className={`ds-btn ds-btn--ink-yellow ${styles.submit}`}>
              {busy ? "One sec…" : mode === "signup" ? "Create free account" : "Log in"}
            </button>
          </form>
          {reason === "profile" && (
            <p className={styles.aside}>
              No account needed to start planning. <Link href="/plan">Plan my room free</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
