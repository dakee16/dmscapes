"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

// Email capture for the coming-soon "Room in 3D" premium tier on /pricing.
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
      <div className="snap-in flex items-center gap-3 rounded-xl border border-cobalt/30 bg-cobalt/5 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cobalt">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">You&rsquo;re on the list.</p>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            We&rsquo;ll email <span className="font-medium text-ink">{email.trim()}</span> the
            moment Room in 3D is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2.5 sm:flex-row">
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
          className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-12 shrink-0 cursor-pointer rounded-xl bg-ink px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Saving…" : "Notify me"}
        </button>
      </div>

      {/* Honeypot: off-screen, hidden from humans and assistive tech. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
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
        <p className="mt-2 text-sm text-[#c2321e]" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-ink-soft">
          No spam. One email when it launches, and that&rsquo;s it.
        </p>
      )}
    </form>
  );
}
