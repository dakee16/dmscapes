"use client";

// The sign-in gate over the blurred results (design-handoff/hall-finder 03-Gate): Google
// returns straight here, email goes through the login page; the draft rides in the URL.
import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/site/Modal";
import { startGoogleSignIn } from "@/components/auth/AuthForm";
import { PLUS_PRICE_USD } from "@/lib/plan";
import styles from "./HallFinder.module.css";

export default function Gate({ places, halls, onEmail, onBack }: { places: number; halls: number; onEmail: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  async function google() {
    setBusy(true);
    setError("");
    const err = await startGoogleSignIn(window.location.pathname + window.location.search);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <Modal aria-labelledby="hf-gate-title">
      <section className={styles.gate}>
        <p className={styles.gateSaved}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          {places} {places === 1 ? "place" : "places"} saved
        </p>
        <h2 id="hf-gate-title" className={styles.gateTitle}>
          <span className={`${styles.gateBig} ds-riso`}>Your halls are ranked.</span>
          <span className="ds-serif ds-serif--blue">Sign in to see them.</span>
        </h2>
        <p className={styles.gateText}>We kept your places, days and filters. You won&rsquo;t enter anything again.</p>
        <div className={styles.gateButtons}>
          <button type="button" className={`ds-btn ${styles.gateGoogle}`} onClick={google} disabled={busy}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z" />
            </svg>
            {busy ? "Opening Google…" : "Continue with Google"}
          </button>
          <button type="button" className="ds-btn ds-btn--ink-yellow" onClick={onEmail} disabled={busy}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></svg>
            Continue with email
          </button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.gateCards}>
          <p><span>Free account</span>Your #1 hall, its weekly walk and one route.</p>
          <p><span>Plus · ${PLUS_PRICE_USD} once</span>All {halls} halls ranked, every route, compare halls.</p>
        </div>
        <div className={styles.gateFoot}>
          <button type="button" className={styles.linkBtn} onClick={onBack}>Back to my places</button>
          <span>
            By continuing you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </span>
        </div>
      </section>
    </Modal>
  );
}
