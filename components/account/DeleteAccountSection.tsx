"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/site/Modal";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { usePlannerStore } from "@/lib/store";
import { CloseButton } from "@/components/account-ui/parts";
import s from "./account.module.css";
import d from "@/components/account-ui/Dialog.module.css";

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

  return <section id="delete-account" className={`${s.card} ${s.mini} ${s.danger}`} aria-labelledby="delete-account-heading">
    <h2 id="delete-account-heading" className={s.cardTitle}>Delete account</h2>
    <p className={s.meta}>Permanently remove your account, saved designs and rooms you own. Download anything you want to keep before continuing.</p>
    <button type="button" className={s.dangerBtn} onClick={() => {
      setConfirmation(""); setAcknowledged(false); setError(""); setReauth(false); setOpen(true);
    }}>Delete my account</button>
    {open && <Modal className={d.layer} style={{ "--z": 100 } as React.CSSProperties}
      aria-labelledby="delete-account-title" aria-describedby="delete-account-warning"
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <div className={`ds ${d.sheet} ${d.danger}`} style={{ "--w": "560px" } as React.CSSProperties}>
        <div className={d.top}>
          <p className={d.eyebrow}>Permanent action</p>
          {!busy && <CloseButton onClick={() => setOpen(false)} label="Keep my account" />}
        </div>
        <h2 id="delete-account-title" className={`${d.title} ${d.titleSm}`}>Delete your account?</h2>
        <p id="delete-account-warning" className={d.body}>This cannot be undone. Here is what changes:</p>
        <ul className={d.list}>
          <li>Your profile, saved designs, comments and workspaces you own are deleted, including shared rooms for all members.</li>
          <li>You leave other people&apos;s rooms. Their rooms and saved versions remain.</li>
          <li>Paid access and unused credits are lost. Deletion does not issue a refund or cancel orders placed with retailers.</li>
          <li>Recovery drafts in this browser are cleared. Copies on other devices and records needed for payments or handling reports may remain.</li>
        </ul>
        <form onSubmit={remove} className={d.form}>
          <div>
            <label className={d.label} htmlFor="delete-confirmation">Type DELETE to confirm</label>
            <input id="delete-confirmation" className={d.input} value={confirmation} autoComplete="off" spellCheck={false}
              onChange={event => setConfirmation(event.target.value)} disabled={busy} />
          </div>
          <label className={d.checkRow}><input type="checkbox" checked={acknowledged} disabled={busy}
            onChange={event => setAcknowledged(event.target.checked)} />I understand this is permanent and affects everyone in rooms I own.</label>
          {error && <p className={d.error} role="alert">{error}</p>}
          <div className={d.split}>
            <button type="button" className={`${d.btn} ${d.btnGhostInk}`} disabled={busy} onClick={() => setOpen(false)}>Keep my account</button>
            {reauth ? <button type="button" className={`${d.btn} ${d.btnInk}`} disabled={busy} onClick={signInAgain}>{busy ? "Opening sign-in…" : "Sign in again"}</button>
              : <button type="submit" className={`${d.btn} ${d.btnRed}`} disabled={busy || confirmation !== "DELETE" || !acknowledged}>{busy ? "Deleting…" : "Permanently delete"}</button>}
          </div>
        </form>
      </div>
    </Modal>}
  </section>;
}
