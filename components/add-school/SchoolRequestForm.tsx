"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { RoomSubmissionRequest } from "@/lib/api-types";
import { Check } from "@/components/ds/Icons";
import css from "./AddSchool.module.css";

/**
 * The add-school request (AddSchool.dc.html). Same behavior as
 * components/site/AddSchoolForm: same fields and names, validation, honeypot,
 * session token for priority, POST to /api/room-submissions and the
 * school_submitted event. New here: the length and width draw the room to
 * scale as you type. The preview only reads the fields; it never changes
 * what is submitted. (The Plus/Pro queue note lives beside the form, in
 * QueuePromo.)
 */

const ROOM_TYPES = ["single", "double", "triple", "quad", "suite", "other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SchoolRequestForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [len, setLen] = useState("");
  const [wid, setWid] = useState("");

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
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
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
      <div className={`${css.card} ${css.done}`} role="status">
        <span className={css.doneCheck} aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </span>
        <h2 className={css.doneTitle}>Got it, thank you!</h2>
        <p className={css.doneText}>Your school is in the queue. We&rsquo;ll ping you the moment it&rsquo;s live.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={css.card} aria-label="Add your school">
      {/* Honeypot: visually hidden and skipped by keyboard/screen readers;
          bots that autofill every field reveal themselves. */}
      <div aria-hidden="true" className={css.honeypot}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={css.field}>
        <label className={css.label} htmlFor="college_name">
          College name <span className={css.req}>*</span>
        </label>
        <input
          id="college_name"
          name="college_name"
          required
          maxLength={120}
          placeholder="e.g. University of Washington"
          className={css.input}
        />
      </div>

      <div className={css.pair}>
        <div className={css.field}>
          <label className={css.label} htmlFor="dorm_name">
            Dorm building
          </label>
          <input id="dorm_name" name="dorm_name" maxLength={120} placeholder="e.g. Willow Hall" className={css.input} />
        </div>
        <div className={css.field}>
          <label className={css.label} htmlFor="room_type">
            Room type
          </label>
          <select id="room_type" name="room_type" className={css.input} defaultValue="">
            <option value="">Pick one</option>
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={css.pair}>
        <div className={css.field}>
          <label className={css.label} htmlFor="length_ft">
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
            className={`${css.input} ${css.num}`}
            onInput={(e) => setLen(e.currentTarget.value)}
          />
        </div>
        <div className={css.field}>
          <label className={css.label} htmlFor="width_ft">
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
            className={`${css.input} ${css.num}`}
            onInput={(e) => setWid(e.currentTarget.value)}
          />
        </div>
      </div>

      <ScalePreview length={len} width={wid} />

      <div className={css.field}>
        <label className={css.label} htmlFor="email">
          Email <span className={css.req}>*</span>{" "}
          <span className={css.hint}>(we&rsquo;ll tell you when it&rsquo;s live)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          className={css.input}
        />
      </div>

      {error && (
        <p role="alert" className={css.error}>
          {error}
        </p>
      )}

      <button type="submit" disabled={status === "sending"} className={`ds-btn ds-btn--ink-yellow ${css.submit}`}>
        {status === "sending" ? "Sending…" : "Submit my school"}
      </button>
    </form>
  );
}

/* ---------- Live preview: the room at scale ---------- */

const EXAMPLE = { l: 15, w: 12 }; // the fields' placeholders
const MAX_FT = 16; // px per foot when there's room
const MIN_FT = 3;

function parseFt(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
const show = (n: number) => String(Math.round(n * 100) / 100);

function ScalePreview({ length, width }: { length: string; width: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 596, h: 300 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = parseFt(length);
  const W = parseFt(width);
  const real = L !== null && W !== null;
  const l = Math.min(60, real ? L : EXAMPLE.l);
  const w = Math.min(60, real ? W : EXAMPLE.w);

  // The largest whole-pixel foot that fits, with the room's inner corner on a
  // grid line so every square really is one foot.
  let ft = MAX_FT;
  let ox = 0;
  let oy = 0;
  for (; ft >= MIN_FT; ft--) {
    ox = Math.ceil(24 / ft) * ft;
    oy = Math.ceil(46 / ft) * ft;
    if (ox + l * ft + 5 + 12 <= size.w && oy + w * ft + 5 + 12 <= size.h) break;
  }
  ft = Math.max(ft, MIN_FT);
  // Keep grid squares legible on long rooms: 1, 2, 5 or 10 ft per square.
  const step = [1, 2, 5, 10].find((n) => n * ft >= 8) ?? 10;
  const cell = step * ft;

  const rw = l * ft;
  const rh = w * ft;
  const inside = rw >= 128 && rh >= 58;
  const dims = `${show(l)} × ${show(w)} ft`;
  const area = `${Math.round(l * w)} sq ft`;
  const roomStyle = { left: ox - 5, top: oy - 5, width: rw + 10, height: rh + 10 };
  const outsideStyle =
    size.w - (ox + rw + 5) >= 132
      ? { left: ox + rw + 16, top: oy }
      : { left: ox - 5, top: Math.min(oy + rh + 12, size.h - 44) };

  return (
    <div className={css.preview}>
      <div
        ref={box}
        className={css.previewPaper}
        style={{ backgroundSize: `${cell}px ${cell}px`, backgroundPosition: `${ox}px ${oy}px` }}
        aria-hidden="true"
      >
        <span className={css.previewLabel}>Live preview · 1 square = {step} ft</span>
        <div className={css.room} data-state={real ? "real" : "example"} style={roomStyle}>
          {inside && (
            <span className={css.roomText}>
              <span className={css.roomDims}>{dims}</span>
              <span className={css.roomArea}>{real ? area : "Example size"}</span>
            </span>
          )}
        </div>
        {!inside && (
          <span className={`${css.roomText} ${css.roomOutside}`} style={outsideStyle}>
            <span className={css.roomDims}>{dims}</span>
            <span className={css.roomArea}>{real ? area : "Example size"}</span>
          </span>
        )}
      </div>
      <p className="ds-sr" aria-live="polite">
        {real ? `Room preview: ${dims}, ${area}.` : ""}
      </p>
    </div>
  );
}
