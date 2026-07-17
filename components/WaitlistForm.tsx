"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm({
  id,
  source,
  variant = "light",
}: {
  id: string;
  source: string;
  variant?: "light" | "dark";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  const dark = variant === "dark";

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium ${
          dark
            ? "border-white/25 bg-white/10 text-white"
            : "border-ink/15 bg-white text-ink"
        }`}
        role="status"
      >
        <svg
          className="h-5 w-5 shrink-0 text-highlight"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path
            d="M20 6L9 17l-5-5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={dark ? "" : "text-cobalt"}
          />
        </svg>
        You&apos;re on the list. We&apos;ll email you the day your room plan is ready.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`h-12 flex-1 rounded-xl border px-4 text-base outline-none transition-colors ${
            dark
              ? "border-white/40 bg-white/15 text-white placeholder:text-white/65 focus:border-white focus:bg-white/20"
              : "border-ink/15 bg-white text-ink placeholder:text-ink-soft/60 focus:border-cobalt"
          }`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`h-12 shrink-0 cursor-pointer rounded-xl px-6 text-base font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${
            dark
              ? "bg-highlight text-ink hover:bg-[#ffe174]"
              : "bg-cobalt text-white hover:bg-cobalt-deep"
          }`}
        >
          {status === "loading" ? "Joining…" : "Join the waitlist"}
        </button>
      </div>
      {status === "error" && (
        <p
          className={`mt-2 text-sm ${dark ? "text-highlight" : "text-[#c2321e]"}`}
          role="alert"
        >
          {message}
        </p>
      )}
    </form>
  );
}
