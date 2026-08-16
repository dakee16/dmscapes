"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { hasFeatures } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { RoomSubmissionRequest } from "@/lib/api-types";

const ROOM_TYPES = ["single", "double", "triple", "quad", "suite", "other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AddSchoolForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { openUpgrade } = useUpgrade();
  const priority = hasFeatures(profile);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body: RoomSubmissionRequest = {
      college_name: String(fd.get("college_name") ?? "").trim(),
      dorm_name: String(fd.get("dorm_name") ?? "").trim() || undefined,
      room_type: String(fd.get("room_type") ?? "") || undefined,
      length_ft: Number(fd.get("length_ft")) || undefined,
      width_ft: Number(fd.get("width_ft")) || undefined,
      email: String(fd.get("email") ?? "").trim(),
      // Honeypot: humans never see the field, so it stays empty for them.
      website: String(fd.get("website") ?? "") || undefined,
    };
    if (!body.college_name) {
      setError("College name is required.");
      return;
    }
    if (!body.email) {
      setError("Email is required so we can tell you when your school is live.");
      return;
    }
    if (!EMAIL_RE.test(body.email)) {
      setError("That email doesn't look right.");
      return;
    }
    setStatus("sending");
    setError(null);
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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Try again?");
      }
      track("school_submitted", { college_name: body.college_name, via: "add-school" });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Try again?");
    }
  }

  if (status === "done") {
    return (
      <div className="snap-in rounded-xl border border-ink/10 bg-card p-8 text-center">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-2 font-display text-xl font-bold">Got it, thank you!</h2>
        <p className="mt-2 text-ink-soft">
          Your school is in the queue. We&rsquo;ll ping you the moment it&rsquo;s live.
        </p>
      </div>
    );
  }

  const label = "block text-sm font-medium text-ink";
  const input =
    "mt-1.5 w-full rounded-lg border border-ink/15 bg-card px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 focus:border-cobalt focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Honeypot: visually hidden and skipped by keyboard/screen readers;
          bots that autofill every field reveal themselves. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label className={label} htmlFor="college_name">
          College name <span className="text-cobalt">*</span>
        </label>
        <input
          id="college_name"
          name="college_name"
          required
          maxLength={120}
          placeholder="e.g. University of Washington"
          className={input}
        />
      </div>
      <div>
        <label className={label} htmlFor="dorm_name">
          Dorm building
        </label>
        <input
          id="dorm_name"
          name="dorm_name"
          maxLength={120}
          placeholder="e.g. Willow Hall"
          className={input}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label} htmlFor="room_type">
            Room type
          </label>
          <select id="room_type" name="room_type" className={input} defaultValue="">
            <option value="">Pick one</option>
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="length_ft">
            Length (ft)
          </label>
          <input
            id="length_ft"
            name="length_ft"
            type="number"
            min={4}
            max={60}
            step={0.1}
            inputMode="decimal"
            placeholder="15"
            className={`${input} font-mono`}
          />
        </div>
        <div>
          <label className={label} htmlFor="width_ft">
            Width (ft)
          </label>
          <input
            id="width_ft"
            name="width_ft"
            type="number"
            min={4}
            max={60}
            step={0.1}
            inputMode="decimal"
            placeholder="12"
            className={`${input} font-mono`}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="email">
          Email <span className="text-cobalt">*</span>{" "}
          <span className="font-normal text-ink-soft">(we&rsquo;ll tell you when it&rsquo;s live)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          className={input}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      {priority ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none tracking-wide text-ink">
            Priority
          </span>
          Your request skips to the front of the queue.
        </p>
      ) : (
        <p className="text-sm text-ink-soft">
          Want yours added first?{" "}
          <button
            type="button"
            onClick={() => openUpgrade("school-request")}
            className="cursor-pointer font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
          >
            Plus and Pro skip the queue
          </button>
          .
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-cobalt px-6 py-3 font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Sending…" : "Submit my school"}
      </button>
    </form>
  );
}
