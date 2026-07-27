"use client";

import { useState } from "react";

// Waitlist-page contact form. There's no contact table or email service wired
// up on this branch, so submit composes a prefilled email to the team and hands
// off to the visitor's mail app. It's a real form, not a bare mailto link.
const CONTACT_EMAIL = "info@dormscape.us";

const INPUT =
  "h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    const msg = message.trim();
    if (!em) {
      setError("Enter your email so we can reply.");
      return;
    }
    if (!msg) {
      setError("Add a message before sending.");
      return;
    }
    setError("");
    const subject = `Dormscape contact from ${name.trim() || em}`;
    const body = [
      msg,
      "",
      "---",
      `From: ${name.trim() || "(no name given)"}`,
      `Email: ${em}`,
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-cobalt">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
            Opening your email app
          </h2>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Send the message from there and we&apos;ll reply to{" "}
            <span className="font-medium text-ink">{email.trim()}</span>. If nothing
            opened, email us directly at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setName("");
              setMessage("");
            }}
            className="mt-5 text-sm font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt"
          >
            Write another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
            Your email
          </label>
          <input
            id="contact-email"
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
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
            Name <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
            Message
          </label>
          <textarea
            id="contact-message"
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

      {error && (
        <p className="mt-4 text-sm text-[#c2321e]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-5 h-12 w-full cursor-pointer rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep sm:w-auto"
      >
        Send message
      </button>
    </form>
  );
}
