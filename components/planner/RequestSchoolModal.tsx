"use client";

import Modal from "@/components/site/Modal";
import { CloseIcon } from "@/components/ds/Icons";
import dlg from "@/components/plan-steps/Dialogs.module.css";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { hasFeatures } from "@/lib/plan";
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
  const priority = hasFeatures(profile);

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
    if (!email.trim()) {
      setStatus("error");
      setMessage("Email is required so we can tell you when your school is live.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setStatus("error");
      setMessage("That email doesn't look right.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const body: RoomSubmissionRequest = {
      college_name: collegeName.trim(),
      email: email.trim(),
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
    <Modal
      className={dlg.layer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-school-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={dlg.card}>
        <div className={dlg.head}>
          <div>
            <p className={dlg.eyebrow}>Not on the list?</p>
            <h2 id="request-school-title" className={dlg.title}>
              Add your school
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={dlg.close}>
            <CloseIcon size={20} />
          </button>
        </div>

        {status === "success" ? (
          <div className={dlg.success}>
            <p>
              <strong>Got it. {collegeName.trim()} is on the list.</strong>
            </p>
            <p>
              We add schools by request volume, and we&apos;ll email you when yours is
              live. Meanwhile, you can still plan your room with manual measurements.
            </p>
            <div className={`${dlg.actions} ${dlg.stack}`}>
              <button type="button" onClick={onClose} className={dlg.primary}>
                Back to planning
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={dlg.form} noValidate>
            {/* Honeypot: visually hidden and skipped by keyboard/screen
                readers; bots that autofill every field reveal themselves. */}
            <div aria-hidden="true" className={dlg.honeypot}>
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
            <p className={dlg.text} style={{ marginTop: 0 }}>
              We&apos;ll collect the floor plans and dimensions. You plan the room.
            </p>
            <div>
              <label htmlFor="req-college" className={`ds-label ${dlg.label}`}>
                College name <span className={dlg.req}>*</span>
              </label>
              <input
                ref={inputRef}
                id="req-college"
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. University of Washington"
                className={`ds-input ${dlg.input}`}
              />
            </div>
            <div>
              <label htmlFor="req-email" className={`ds-label ${dlg.label}`}>
                Email <span className={dlg.req}>*</span>{" "}
                <span className={dlg.hint}>(so we can tell you when it&apos;s live)</span>
              </label>
              <input
                id="req-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className={`ds-input ${dlg.input}`}
              />
            </div>
            {priority && (
              <p className={dlg.priority}>
                <span>Priority</span>
                Your request skips to the front of the queue.
              </p>
            )}
            {status === "error" && (
              <p className={dlg.alert} role="alert">
                {message}
              </p>
            )}
            <button type="submit" disabled={status === "loading"} className={dlg.primary}>
              {status === "loading" ? "Sending…" : "Add my school"}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
