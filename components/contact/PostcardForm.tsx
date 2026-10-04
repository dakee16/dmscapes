"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import type { ContactRequest } from "@/lib/api-types";
import { Check } from "@/components/ds/Icons";
import css from "./Contact.module.css";

/**
 * The contact form as a postcard (Contact.dc.html). Same behavior as
 * components/site/ContactForm: same fields, validation, honeypot, POST to
 * /api/contact with a ContactRequest, and the contact_submitted event.
 */
export default function PostcardForm() {
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

  const stamp = (
    <>
      <div className={css.stamp} aria-hidden="true">
        <div className={css.stampArt}>
          <span />
          <span />
          <span />
          <span className={css.stampName}>DORMSCAPE</span>
        </div>
      </div>
      <div className={css.postmark} aria-hidden="true">
        MEASURE
        <br />
        IMAGINE
        <br />
        MAKE ROOM
      </div>
    </>
  );

  if (sent) {
    return (
      <div className={`${css.card} ${css.sent}`} role="status">
        {stamp}
        <p className={css.dear}>Dear Dormscape,</p>
        <div className={css.sentBody}>
          <span className={css.sentCheck} aria-hidden="true">
            <Check size={30} strokeWidth={3} />
          </span>
          <h2 className={css.sentTitle}>
            Message <span className="ds-serif ds-serif--blue">sent.</span>
          </h2>
          <p className={css.sentText}>
            Thanks for reaching out. We read everything and will reply to <strong>{email.trim()}</strong> as soon as we
            can.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setName("");
              setPhone("");
              setMessage("");
            }}
            className={`ds-link ${css.again}`}
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={css.card} aria-label="Contact form" noValidate>
      {stamp}
      <p className={css.dear}>Dear Dormscape,</p>

      <div className={css.body}>
        <div className={css.messageCol}>
          <label htmlFor="c-message" className={css.label}>
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
            className={css.lined}
          />
        </div>
        <span className={css.divider} aria-hidden="true" />
        <div className={css.fields}>
          <div className={css.field}>
            <label htmlFor="c-email" className={css.label}>
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
              className={`${css.line} ${css.lineStrong}`}
            />
          </div>
          <div className={css.field}>
            <label htmlFor="c-name" className={css.label}>
              Name <span className={css.optional}>(optional)</span>
            </label>
            <input
              id="c-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className={css.line}
            />
          </div>
          <div className={css.field}>
            <label htmlFor="c-phone" className={css.label}>
              Phone <span className={css.optional}>(optional)</span>
            </label>
            <input
              id="c-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className={css.line}
            />
          </div>

          {/* Honeypot: off-screen, hidden from assistive tech and humans. */}
          <div aria-hidden="true" className={css.honeypot}>
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
            <p className={css.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className={`ds-btn ds-btn--ink-yellow ${css.send}`}>
            {busy ? "Sending…" : "Send message"}
          </button>
        </div>
      </div>
    </form>
  );
}
