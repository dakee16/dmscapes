"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/site/Modal";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { usePlannerStore } from "@/lib/store";
import s from "@/components/site/Support.module.css";

export default function DeleteAccountSection({ onLeave }: { onLeave: () => void }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!open || busy) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, busy]);

  async function signInAgain() {
    setBusy(true);
    onLeave();
    try { await signOut(); }
    finally { window.location.assign("/login?next=%2Faccount%2Fsettings%23delete-account"); }
  }
  async function remove(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || confirmation !== "DELETE" || !acknowledged) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const client = getBrowserClient();
      const session = await client?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) { setError("Sign in again to confirm this is your account."); setReauth(true); return; }
      const response = await fetch("/api/account/delete", {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmation, acknowledged }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Account deletion failed. Please try again.");
        setReauth(response.status === 401); return;
      }
      onLeave();
      // Remove only this account's recovery copies and the current planner draft.
      usePlannerStore.getState().resetPlanner();
      try {
        for (const storage of [sessionStorage, localStorage]) {
          for (const key of Object.keys(storage)) {
            if (key.startsWith(`dormscape-workspace:${user?.id}:`)) storage.removeItem(key);
          }
        }
      } catch { /* Other devices must clear their local drafts independently. */ }
      try { await signOut(); }
      finally { window.location.replace("/account/deleted"); }
    } catch { setError("We couldn't confirm deletion. Check your connection and sign in again before retrying."); }
    finally { pending.current = false; setBusy(false); }
  }

  return <section id="delete-account" className={s.dangerSection}>
    <p className={s.eyebrow}>04 / Your data, your choice</p>
    <h2>Delete account</h2>
    <p>Permanently remove your account, saved designs and rooms you own. Download anything you want to keep before continuing.</p>
    <button type="button" className={s.secondary} onClick={() => {
      setConfirmation(""); setAcknowledged(false); setError(""); setReauth(false); setOpen(true);
    }}>Delete my account <span aria-hidden="true">↗</span></button>
    {open && <Modal className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      aria-labelledby="delete-account-title" aria-describedby="delete-account-warning"
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <div className={s.dialog}>
        <p className={s.eyebrow}>Permanent action</p>
        <h2 id="delete-account-title">Delete your account?</h2>
        <p id="delete-account-warning">This cannot be undone. Here is what changes:</p>
        <ul>
          <li>Your profile, saved designs, comments and workspaces you own are deleted, including shared rooms for all members.</li>
          <li>You leave other people&apos;s rooms. Their rooms and saved versions remain.</li>
          <li>Paid access and unused credits are lost. Deletion does not issue a refund or cancel orders placed with retailers.</li>
          <li>Recovery drafts in this browser are cleared. Copies on other devices and records needed for payments or handling reports may remain.</li>
        </ul>
        <form onSubmit={remove}>
          <label className={s.field} htmlFor="delete-confirmation">Type DELETE to confirm
            <input id="delete-confirmation" value={confirmation} autoComplete="off" spellCheck={false}
              onChange={event => setConfirmation(event.target.value)} disabled={busy} />
          </label>
          <label className={s.check}><input type="checkbox" checked={acknowledged} disabled={busy}
            onChange={event => setAcknowledged(event.target.checked)} />I understand this is permanent and affects everyone in rooms I own.</label>
          {error && <p className={s.error} role="alert">{error}</p>}
          <div className={s.actions}>
            <button type="button" className={s.secondary} disabled={busy} onClick={() => setOpen(false)}>Keep my account</button>
            {reauth ? <button type="button" className={s.primary} disabled={busy} onClick={signInAgain}>{busy ? "Opening sign-in…" : "Sign in again"}</button>
              : <button type="submit" className={s.danger} disabled={busy || confirmation !== "DELETE" || !acknowledged}>{busy ? "Deleting…" : "Permanently delete"}</button>}
          </div>
        </form>
      </div>
    </Modal>}
  </section>;
}
