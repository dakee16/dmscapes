"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { Check } from "@/components/ds/Icons";
import css from "@/components/account-ui/Notify.module.css";

// Legacy interest capture. The live 3D launch no longer renders this form.
// Reuses the existing waitlist table/route with a source that flags it as
// premium interest, so demand is measurable without a new table.
const SOURCE = "premium_3d";

export default function PremiumNotify() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email and we'll tell you first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: SOURCE,
          website: website || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Couldn't save your email. Try again in a minute.");
        setBusy(false);
        return;
      }
      track("premium_waitlist_signup", { source: SOURCE });
      setDone(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className={css.done}>
        <span aria-hidden="true">
          <Check size={20} color="#fff" />
        </span>
        <div>
          <p className={css.doneTitle}>You&rsquo;re on the list.</p>
          <p className={css.doneText}>
            We&rsquo;ll email <strong>{email.trim()}</strong> the moment Room in 3D is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={css.form}>
      <div className={css.row}>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="you@school.edu"
          aria-label="Email address"
          className="ds-input"
        />
        <button type="submit" disabled={busy} className="ds-btn ds-btn--ink-yellow">
          {busy ? "Saving…" : "Notify me"}
        </button>
      </div>

      {/* Honeypot: off-screen, hidden from humans and assistive tech. */}
      <div aria-hidden="true" className={css.trap}>
        <label htmlFor="p-website">Leave this field empty</label>
        <input
          id="p-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error ? (
        <p className={css.error} role="alert">
          {error}
        </p>
      ) : (
        <p className={css.note}>No spam. One email when it launches, and that&rsquo;s it.</p>
      )}
    </form>
  );
}
