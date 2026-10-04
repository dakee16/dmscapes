"use client";

import Modal from "@/components/site/Modal";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import type { UsernameCheckResponse } from "@/lib/api-types";
import { CloseButton } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown";
const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;
const SKIP_KEY = "dormscape-username-prompted";

/**
 * Post-signup username claim, as a standalone global prompt (mounted once by
 * AuthProvider). Replaces the username step that used to live inside the auth
 * modal. It is SEQUENCED after the SignupWelcome: it stays hidden while
 * `signupWelcomeOpen` is true and for a short grace after signup, so a brand-new
 * user sees "here's your free credit" first, then the username ask, never both
 * at once (Part 3), regardless of whether they signed up with email or Google.
 */
export default function UsernamePrompt() {
  const { user, profile, refreshProfile, signupWelcomeOpen } = useAuth();
  const needsUsername = Boolean(user && profile && profile.username === null);

  const [username, setUsername] = useState("");
  const [uStatus, setUStatus] = useState<UsernameStatus>("idle");
  const [uError, setUError] = useState("");
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [graceOver, setGraceOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only show once the welcome has had its turn: a short grace lets SignupWelcome
  // open first (it flips signupWelcomeOpen true), so this waits behind it; if no
  // welcome applies, the grace simply elapses and this shows on its own.
  useEffect(() => {
    if (!needsUsername) {
      setGraceOver(false);
      return;
    }
    if (typeof window !== "undefined" && window.sessionStorage.getItem(SKIP_KEY)) {
      setSkipped(true);
    }
    const t = setTimeout(() => setGraceOver(true), 700);
    return () => clearTimeout(t);
  }, [needsUsername]);

  const open = needsUsername && graceOver && !signupWelcomeOpen && !skipped;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced availability check.
  useEffect(() => {
    if (!open) return;
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
        setUStatus(data.available ? "available" : "taken");
      } catch {
        setUStatus("unknown");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username, open]);

  function skip() {
    if (typeof window !== "undefined") window.sessionStorage.setItem(SKIP_KEY, "1");
    setSkipped(true);
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
      const { error: err } = await supabase.from("profiles").update({ username: value }).eq("id", user.id);
      if (err) {
        setUError(err.code === "23505" ? "That username is taken." : "Couldn't save that. Try again.");
        return;
      }
      track("username_set");
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  }

  const uHint: { text: string; tone: "soft" | "good" | "bad" } | null = (() => {
    if (!username.trim()) return null;
    switch (uStatus) {
      case "checking": return { text: "Checking…", tone: "soft" };
      case "available": return { text: `@${username.trim()} is available`, tone: "good" };
      case "taken": return { text: "Taken. Try another.", tone: "bad" };
      case "invalid": return { text: "3-20 characters; letters, numbers, underscore, period.", tone: "bad" };
      case "unknown": return { text: "We'll double-check when you save.", tone: "soft" };
      default: return null;
    }
  })();

  if (!open) return null;

  return (
    <Modal
      className={`${d.layer} ${d.bottom}`}
      style={{ "--z": 60 } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-prompt-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) skip(); }}
    >
      <div className={`ds ${d.sheet}`} style={{ "--w": "460px" } as React.CSSProperties}>
        <div className={d.top}>
          <p className={d.eyebrow}>Your profile</p>
          <CloseButton onClick={skip} label="Skip for now" />
        </div>
        <h2 id="username-prompt-title" className={`${d.title} ${d.titleSm}`} style={{ marginTop: 10 }}>
          Claim your <span className={d.serif}>username.</span>
        </h2>
        <form onSubmit={handleClaim} className={d.form} noValidate>
          <p className={d.body} style={{ margin: 0 }}>One last thing: pick the name your designs live under.</p>
          <div>
            <label htmlFor="username-claim" className={d.label}>Username</label>
            <div className={d.at}>
              <span aria-hidden="true">@</span>
              <input
                ref={inputRef}
                id="username-claim"
                type="text"
                autoComplete="username"
                maxLength={20}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUError(""); }}
                placeholder="dormdesigner"
              />
            </div>
            {uHint && (
              <p className={d.hint} data-tone={uHint.tone} role="status">
                {uHint.text}
              </p>
            )}
          </div>
          {uError && <p className={d.error} role="alert">{uError}</p>}
          <button type="submit" disabled={busy || uStatus === "taken" || uStatus === "invalid" || !username.trim()} className={`${d.btn} ${d.btnInk} ${d.wide}`}>
            {busy ? "Claiming…" : "Claim username"}
          </button>
          <button type="button" onClick={skip} className={d.later} style={{ marginTop: -8 }}>
            Skip for now
          </button>
        </form>
      </div>
    </Modal>
  );
}
