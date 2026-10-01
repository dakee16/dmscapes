"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase-browser";
import { REPORT_CATEGORIES, reportPath } from "@/lib/reports";
import { ArrowRight, ArrowUpRight, Check } from "@/components/ds/Icons";
import s from "@/components/report/ReportForm.module.css";

export default function ReportForm({ from }: { from: string | null }) {
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(from ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const pending = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const website = new FormData(event.currentTarget).get("website");
    if (description.trim().length < 20) { setError("Add a little more detail, at least 20 characters, so we can investigate."); return; }
    if (page.trim() && !reportPath(page.trim())) { setError("Use a Dormscape page path, such as /plan or /rooms. Do not include an invite link."); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      const session = await getBrowserClient()?.auth.getSession();
      const token = session?.data.session?.access_token;
      const response = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ category, description, email, page_path: reportPath(page.trim()), website }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.error ?? "Your report was not sent. Please try again."); return; }
      setReference(result.reference);
    } catch { setError("Your report was not confirmed. Check your connection and try again."); }
    finally { pending.current = false; setBusy(false); }
  }
  if (reference) return <div className={s.success} role="status"><span aria-hidden="true"><Check size={26} /></span>
    <h2>Report received.</h2><p>Thanks for helping us make Dormscape better. Your reference is <strong>{reference}</strong>.</p>
    <p>{email ? "We can follow up using the email you provided." : "No reply email was provided. Keep this reference if you contact us later."}</p>
    <Link href={from ?? "/"} className={s.primary}>Back to {from ? "your page" : "Dormscape"}<ArrowUpRight /></Link>
  </div>;
  return <form onSubmit={submit} className={s.form} aria-label="Report a problem">
    <label className={s.field} htmlFor="report-category">What would you like to report?
      <select id="report-category" value={category} onChange={event => setCategory(event.target.value)} disabled={busy}>
        {REPORT_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
    <label className={s.field} htmlFor="report-description">What happened?
      <textarea id="report-description" required minLength={20} maxLength={5000} value={description} disabled={busy}
        placeholder="Tell us what you were doing, what you expected, and what happened instead."
        onChange={event => setDescription(event.target.value)} aria-describedby="report-details-hint" />
      <small id="report-details-hint">Do not include passwords, payment details or private invitation links. {description.length}/5,000</small></label>
    <label className={s.field} htmlFor="report-page">Page path <small>Optional</small>
      <input id="report-page" maxLength={500} value={page} onChange={event => setPage(event.target.value)} placeholder="/plan" disabled={busy} />
      <small>Only the path is sent, not URL queries or invite tokens.</small></label>
    <label className={s.field} htmlFor="report-email">Reply email <small>Optional</small>
      <input id="report-email" type="email" maxLength={254} value={email} autoComplete="email"
        onChange={event => setEmail(event.target.value)} placeholder="you@school.edu" disabled={busy} /></label>
    <div className={s.trap} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className={s.hint}>Reports go privately to the Dormscape team, not to other room members. <Link href="/privacy" className={s.link}>Privacy policy</Link></p>
    {error && <p role="alert" className={s.error}>{error}</p>}
    <button type="submit" disabled={busy} className={s.primary}>{busy ? "Sending report…" : "Send report"}<ArrowRight /></button>
  </form>;
}
