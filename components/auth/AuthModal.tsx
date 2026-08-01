"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import type { UsernameCheckResponse } from "@/lib/api-types";

type Mode = "login" | "signup";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown";

const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PROMPTED_KEY = "dormscape-username-prompted";
const OAUTH_PENDING_KEY = "dormscape-oauth-pending";

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.87 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/** Global auth dialog. Mounted once by AuthProvider; all state via useAuth(). */
export default function AuthModal() {
  const {
    configured,
    user,
    profile,
    modalOpen,
    modalReason,
    openAuthModal,
    closeAuthModal,
    refreshProfile,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  // Forgot-password sub-flow (login/email path only).
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [username, setUsername] = useState("");
  const [uStatus, setUStatus] = useState<UsernameStatus>("idle");
  const [uError, setUError] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Signup isn't finished until a username exists.
  const needsUsername = Boolean(user && profile && profile.username === null);

  // OAuth return path: the redirect landed us back with a session; record it.
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (window.localStorage.getItem(OAUTH_PENDING_KEY)) {
      window.localStorage.removeItem(OAUTH_PENDING_KEY);
      track("auth_completed", { mode: "oauth", provider: "google" });
    }
  }, [user]);

  // Reopen on the username step after an OAuth redirect (once per session).
  // Part of a signup the user initiated; never fires for logged-out users.
  useEffect(() => {
    if (!needsUsername || modalOpen) return;
    if (window.sessionStorage.getItem(PROMPTED_KEY)) return;
    window.sessionStorage.setItem(PROMPTED_KEY, "1");
    openAuthModal("profile");
  }, [needsUsername, modalOpen, openAuthModal]);

  // Fully signed in (username claimed): nothing left to show.
  useEffect(() => {
    if (modalOpen && user && profile?.username) closeAuthModal();
  }, [modalOpen, user, profile, closeAuthModal]);

  // Reset transient state on open; focus the right field.
  useEffect(() => {
    if (!modalOpen) return;
    setError("");
    setUError("");
    setBusy(false);
    setConfirmSent(false);
    setResetMode(false);
    setResetSent(false);
    const t = setTimeout(
      () => (needsUsername ? usernameRef : emailRef).current?.focus(),
      60
    );
    return () => clearTimeout(t);
  }, [modalOpen, needsUsername]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAuthModal();
    }
    if (modalOpen) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [modalOpen, closeAuthModal]);

  // Debounced username availability check.
  useEffect(() => {
    if (!modalOpen || !needsUsername) return;
    const value = username.trim();
    if (!value) {
      setUStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(value)) {
      setUStatus("invalid");
      return;
    }
    setUStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?u=${encodeURIComponent(value)}`);
        const data = (await res.json()) as UsernameCheckResponse;
        if (data.available === null) setUStatus("unknown");
        else setUStatus(data.available ? "available" : "taken");
      } catch {
        setUStatus("unknown");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, modalOpen, needsUsername]);

  if (!modalOpen) return null;

  async function handleGoogle() {
    const supabase = getBrowserClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    window.localStorage.setItem(OAUTH_PENDING_KEY, "1");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    if (err) {
      window.localStorage.removeItem(OAUTH_PENDING_KEY);
      setError(err.message);
      setBusy(false);
    }
    // On success the browser navigates away; no state to restore.
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
    if (password.length < 6) {
      setError("Password needs at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: mail,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        track("auth_completed", { mode: "signup", provider: "email" });
        // Session null = email confirmation is on; otherwise the auth listener
        // fires and the username step renders via needsUsername.
        if (!data.session) setConfirmSent(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        track("auth_completed", { mode: "login", provider: "email" });
      }
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
      const { error: err } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setResetSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    const value = username.trim();
    if (!USERNAME_RE.test(value)) {
      setUError("3-20 characters; letters, numbers, underscore, period.");
      return;
    }
    if (!supabase || !user || busy) return;
    setBusy(true);
    setUError("");
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({ username: value })
        .eq("id", user.id);
      if (err) {
        setUError(
          err.code === "23505"
            ? "That username is taken."
            : "Couldn't save that. Try again."
        );
        return;
      }
      track("username_set");
      // profile.username lands → the auto-close effect shuts the modal.
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  }

  const saveDesign = modalReason === "save-design";
  const buyReason = modalReason === "buy";
  const title = needsUsername
    ? "Claim your username"
    : confirmSent
      ? "Check your inbox"
      : resetMode
        ? resetSent
          ? "Check your inbox"
          : "Reset your password"
        : saveDesign
          ? "Save your design"
          : buyReason
            ? "One quick step to buy"
            : "Welcome to Dormscape";

  const uHint: { text: string; tone: "soft" | "good" | "bad" } | null = (() => {
    if (!username.trim()) return null;
    switch (uStatus) {
      case "checking":
        return { text: "Checking…", tone: "soft" };
      case "available":
        return { text: `@${username.trim()} is available`, tone: "good" };
      case "taken":
        return { text: "Taken. Try another.", tone: "bad" };
      case "invalid":
        return {
          text: "3-20 characters; letters, numbers, underscore, period.",
          tone: "bad",
        };
      case "unknown":
        return { text: "We'll double-check when you save.", tone: "soft" };
      default:
        return null;
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="snap-in w-full max-w-md rounded-t-2xl border border-ink/10 bg-paper p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="auth-modal-title"
            className="font-display text-xl font-bold tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!configured ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
              Accounts aren&apos;t live quite yet. Your designs still work
              without one.
            </p>
            <button
              type="button"
              disabled
              className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-ink/15 bg-white text-sm font-semibold text-ink opacity-50"
            >
              <GoogleG /> Continue with Google
            </button>
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-xl bg-cobalt text-sm font-semibold text-white opacity-50"
            >
              Continue with email
            </button>
          </div>
        ) : confirmSent ? (
          <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-4 text-sm leading-relaxed">
            <p className="font-semibold">
              We sent a confirmation link to {email.trim()}.
            </p>
            <p className="mt-1 text-ink-soft">
              Click it to activate your account, then come back and log in.
            </p>
            <button
              type="button"
              onClick={closeAuthModal}
              className="mt-4 h-11 w-full cursor-pointer rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Got it
            </button>
          </div>
        ) : resetMode ? (
          resetSent ? (
            <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-4 text-sm leading-relaxed">
              <p className="font-semibold">
                If {email.trim()} has an account, a reset link is on its way.
              </p>
              <p className="mt-1 text-ink-soft">
                Open it to set a new password. The link expires soon, so use it
                while it&apos;s fresh.
              </p>
              <button
                type="button"
                onClick={closeAuthModal}
                className="mt-4 h-11 w-full cursor-pointer rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-cobalt"
              >
                Got it
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-1" noValidate>
              <p className="text-sm leading-relaxed text-ink-soft">
                Enter your email and we&apos;ll send a link to set a new password.
              </p>
              <div className="mt-4">
                <label htmlFor="auth-reset-email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="auth-reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
                />
              </div>
              {error && (
                <p className="mt-3 text-sm text-[#c2321e]" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-4 h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setError("");
                }}
                className="mt-3 block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink"
              >
                Back to log in
              </button>
            </form>
          )
        ) : needsUsername ? (
          <form onSubmit={handleClaim} className="mt-4 space-y-3" noValidate>
            <p className="text-sm leading-relaxed text-ink-soft">
              One last thing: pick the name your designs live under.
            </p>
            <div>
              <label htmlFor="auth-username" className="mb-1.5 block text-sm font-medium">
                Username
              </label>
              <div className="flex h-12 items-center rounded-xl border border-ink/15 bg-white pl-4 transition-colors focus-within:border-cobalt">
                <span className="font-mono text-sm text-ink-soft" aria-hidden="true">
                  @
                </span>
                <input
                  ref={usernameRef}
                  id="auth-username"
                  type="text"
                  autoComplete="username"
                  maxLength={20}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUError("");
                  }}
                  placeholder="dormdesigner"
                  className="focus-quiet h-full flex-1 rounded-r-xl bg-transparent px-1.5 text-base outline-none placeholder:text-ink-soft/60"
                />
              </div>
              {uHint && (
                <p
                  className={`mt-1.5 font-mono text-xs ${
                    uHint.tone === "bad"
                      ? "text-[#c2321e]"
                      : uHint.tone === "good"
                        ? "text-cobalt"
                        : "text-ink-soft"
                  }`}
                  role="status"
                >
                  {uHint.text}
                </p>
              )}
            </div>
            {uError && (
              <p className="text-sm text-[#c2321e]" role="alert">
                {uError}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || uStatus === "taken" || uStatus === "invalid" || !username.trim()}
              className="h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "Claiming…" : "Claim username"}
            </button>
            <button
              type="button"
              onClick={closeAuthModal}
              className="block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Skip for now
            </button>
          </form>
        ) : user && !profile ? (
          <p className="mt-4 text-sm text-ink-soft" role="status">
            Setting up your account…
          </p>
        ) : (
          <div className="mt-1">
            <p className="text-sm leading-relaxed text-ink-soft">
              {saveDesign
                ? "Create a free account to keep this room."
                : buyReason
                  ? "Log in or grab a free account, then we'll send you straight to Amazon. Your room stays exactly as it is."
                  : "Save designs and pick up where you left off. Free."}
            </p>
            <div className="mt-4 grid grid-cols-2 rounded-xl border border-ink/10 bg-white p-1 text-sm font-semibold">
              {(["signup", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={`cursor-pointer rounded-lg py-2 transition-colors ${
                    mode === m ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {m === "signup" ? "Sign up" : "Log in"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-ink/15 bg-white text-sm font-semibold text-ink transition-colors hover:border-ink/30 disabled:cursor-wait disabled:opacity-70"
            >
              <GoogleG /> Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-ink/10" />
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                or
              </span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>
            <form onSubmit={handleCredentials} className="space-y-3" noValidate>
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "6+ characters" : "Your password"}
                  className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
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
                {busy
                  ? "One sec…"
                  : mode === "signup"
                    ? "Create free account"
                    : "Log in"}
              </button>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true);
                    setError("");
                  }}
                  className="block w-full cursor-pointer pt-1 text-center text-sm text-ink-soft transition-colors hover:text-ink"
                >
                  Forgot password?
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
