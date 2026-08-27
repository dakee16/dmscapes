"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useAuth, type AuthModalReason } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { passwordMeetsPolicy } from "@/lib/password";
import PasswordChecklist from "@/components/auth/PasswordChecklist";

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
  "This is taking longer than expected — check your connection and try again.";

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
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.87 8.87 4.77 12 4.77Z" />
    </svg>
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
          ? "One quick step to buy"
          : generateReason
            ? "One step to your room"
            : "Welcome back";

  if (!configured) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">Accounts are almost here</h2>
        <p className="rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
          Accounts aren&apos;t live quite yet. Your designs still work without one.
        </p>
        <Link href="/plan" className="flex h-12 w-full items-center justify-center rounded-xl bg-cobalt text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep">
          Start planning
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>

      {confirmSent ? (
        <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-4 text-sm leading-relaxed">
          <p className="font-semibold">We sent a confirmation link to {email.trim()}.</p>
          <p className="mt-1 text-ink-soft">Click it to activate your account, then come back and log in.</p>
          <button
            type="button"
            onClick={() => {
              setConfirmSent(false);
              setMode("login");
            }}
            className="mt-4 h-11 w-full cursor-pointer rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-cobalt"
          >
            Back to log in
          </button>
        </div>
      ) : resetMode ? (
        resetSent ? (
          <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-4 text-sm leading-relaxed">
            <p className="font-semibold">If {email.trim()} has an account, a reset link is on its way.</p>
            <p className="mt-1 text-ink-soft">Open it to set a new password. The link expires soon, so use it while it&apos;s fresh.</p>
            <button
              type="button"
              onClick={() => { setResetMode(false); setResetSent(false); }}
              className="mt-4 h-11 w-full cursor-pointer rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-4" noValidate>
            <p className="text-sm leading-relaxed text-ink-soft">Enter your email and we&apos;ll send a link to set a new password.</p>
            <div className="mt-4">
              <label htmlFor="auth-reset-email" className="mb-1.5 block text-sm font-medium">Email</label>
              <input id="auth-reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt" />
            </div>
            {error && <p className="mt-3 text-sm text-[#c2321e]" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="mt-4 h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70">
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <button type="button" onClick={() => { setResetMode(false); setError(""); }} className="mt-3 block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink">
              Back to log in
            </button>
          </form>
        )
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-ink-soft">
            {saveDesign
              ? "Create a free account to keep this room."
              : buyReason
                ? "Log in or grab a free account, then we'll send you straight to Amazon. Your room stays exactly as it is."
                : generateReason
                  ? "Create a free account to generate your room. Every choice you just made is saved, so you pick up right here."
                  : "Save designs and pick up where you left off. Free."}
          </p>
          <div className="mt-4 grid grid-cols-2 rounded-xl border border-ink/10 bg-white p-1 text-sm font-semibold">
            {(["signup", "login"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(""); setExistingNotice(false); }} className={`cursor-pointer rounded-lg py-2 transition-colors ${mode === m ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}>
                {m === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>
          {mode === "login" && existingNotice && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cobalt/30 bg-cobalt/[0.06] px-4 py-3" role="status">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[13px] leading-snug text-ink">
                <span className="font-semibold">An account with this email already exists.</span>{" "}
                We switched you to log in{email.trim() ? ", " : "."}
                {email.trim() && (<>just enter your password for <span className="font-medium">{email.trim()}</span>.</>)}
              </p>
            </div>
          )}
          <button type="button" onClick={handleGoogle} disabled={busy} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-ink/15 bg-white text-sm font-semibold text-ink transition-colors hover:border-ink/30 disabled:cursor-wait disabled:opacity-70">
            <GoogleG /> Continue with Google
          </button>
          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">or</span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <form onSubmit={handleCredentials} className="space-y-3" noValidate>
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium">Email</label>
              <input ref={emailRef} id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (existingNotice) setExistingNotice(false); }} placeholder="you@school.edu" className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt" />
            </div>
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium">Password</label>
              <input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "8 to 12 characters" : "Your password"} className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt" />
              {mode === "signup" && <PasswordChecklist password={password} />}
            </div>
            {mode === "signup" && (
              <div className="flex items-start gap-2.5 pt-0.5">
                <input id="auth-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-label="I agree to the Terms of Service and Privacy Policy" className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cobalt" />
                <p className="text-[13px] leading-snug text-ink-soft">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-cobalt underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt-deep">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-cobalt underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt-deep">Privacy Policy</Link>.
                </p>
              </div>
            )}
            {error && <p className="text-sm text-[#c2321e]" role="alert">{error}</p>}
            <button type="submit" disabled={busy || signupBlocked} aria-disabled={busy || signupBlocked} className={`h-12 w-full rounded-xl text-base font-semibold text-white transition-colors ${signupBlocked ? "cursor-not-allowed bg-cobalt/40" : "cursor-pointer bg-cobalt hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"}`}>
              {busy ? "One sec…" : mode === "signup" ? "Create free account" : "Log in"}
            </button>
            {mode === "login" && (
              <button type="button" onClick={() => { setResetMode(true); setError(""); }} className="block w-full cursor-pointer pt-1 text-center text-sm text-ink-soft transition-colors hover:text-ink">
                Forgot password?
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
