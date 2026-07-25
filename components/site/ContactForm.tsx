"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import type { ContactRequest } from "@/lib/api-types";

const INPUT =
  "h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedEmail) {
      setError("Enter your email so we can reply.");
      return;
    }
    if (!trimmedMessage) {
      setError("Add a message before sending.");
      return;
    }
    setError("");
    setBusy(true);
    const body: ContactRequest = {
      from_email: trimmedEmail,
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      message: trimmedMessage,
      website: website || undefined,
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Couldn't send your message. Try again in a minute.");
        setBusy(false);
        return;
      }
      track("contact_submitted");
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (sent) {
    // Success state — the same cobalt check + reassurance language the
    // confirmation page uses.
    return (
      <div className="snap-in rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-cobalt">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
            Message <span className="hl">sent</span>.
          </h2>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Thanks for reaching out. We read everything and will reply to{" "}
            <span className="font-medium text-ink">{email.trim()}</span> as soon as we can.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setName("");
              setPhone("");
              setMessage("");
            }}
            className="mt-6 text-sm font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium">
            Your email
          </label>
          <input
            id="c-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@school.edu"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">
            Name <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id="c-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="c-phone" className="mb-1.5 block text-sm font-medium">
            Phone <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id="c-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            className={INPUT}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="c-message" className="mb-1.5 block text-sm font-medium">
            Message
          </label>
          <textarea
            id="c-message"
            required
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError("");
            }}
            maxLength={5000}
            placeholder="What's on your mind?"
            className="min-h-36 w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
          />
        </div>
      </div>

      {/* Honeypot: positioned off-screen, hidden from assistive tech and humans. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Leave this field empty</label>
        <input
          id="c-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-[#c2321e]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 h-12 w-full cursor-pointer rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
