"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { isPlus } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { RoomSubmissionRequest } from "@/lib/api-types";

type Status = "idle" | "loading" | "success" | "error";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function RequestSchoolModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [collegeName, setCollegeName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const plus = isPlus(profile);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setMessage("");
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!collegeName.trim()) {
      setStatus("error");
      setMessage("Tell us which college to add.");
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      setStatus("error");
      setMessage("That email doesn't look right.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const body: RoomSubmissionRequest = {
      college_name: collegeName.trim(),
      email: email.trim() || undefined,
      notes: "requested via planner",
      // Honeypot: humans never see the field, so it stays empty for them.
      website: honeypotRef.current?.value || undefined,
    };
    // Attach the session token so Plus members' requests get priority.
    const supabase = getBrowserClient();
    const token = supabase
      ? (await supabase.auth.getSession()).data.session?.access_token
      : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch("/api/room-submissions", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 503) {
        setStatus("error");
        setMessage("Requests aren't open just yet. Check back soon.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(
          (data as { error?: string }).error ?? "Couldn't save that. Try again in a minute."
        );
        return;
      }
      track("school_submitted", { college_name: collegeName.trim(), source: "planner_modal" });
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-school-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="snap-in w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="request-school-title" className="font-display text-xl font-bold tracking-tight">
            Add your school
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-4 rounded-xl border border-ink/10 bg-paper px-4 py-4 text-sm leading-relaxed">
            <p className="font-semibold">Got it. {collegeName.trim()} is on the list. 🎉</p>
            <p className="mt-1 text-ink-soft">
              We add schools by request volume{email ? ", and we'll email you when yours is live" : ""}.
              Meanwhile, you can still plan your room with manual measurements.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 h-11 w-full rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Back to planning
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
            {/* Honeypot: visually hidden and skipped by keyboard/screen
                readers; bots that autofill every field reveal themselves. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label htmlFor="req-website">Website</label>
              <input
                ref={honeypotRef}
                id="req-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">
              We&apos;ll collect the floor plans and dimensions. You plan the room.
            </p>
            <div>
              <label htmlFor="req-college" className="mb-1.5 block text-sm font-medium">
                College name
              </label>
              <input
                ref={inputRef}
                id="req-college"
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. University of Washington"
                className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
              />
            </div>
            <div>
              <label htmlFor="req-email" className="mb-1.5 block text-sm font-medium">
                Email <span className="font-normal text-ink-soft">(get notified when it&apos;s live)</span>
              </label>
              <input
                id="req-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
              />
            </div>
            {plus && (
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <span className="rounded-full bg-highlight px-1.5 py-0.5 font-semibold leading-none text-ink">
                  Plus
                </span>
                Your request skips to the front of the queue.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-[#c2321e]" role="alert">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
            >
              {status === "loading" ? "Sending…" : "Add my school"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
