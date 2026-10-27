"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Wordmark from "@/components/site/Wordmark";
import AuthForm from "@/components/auth/AuthForm";
import styles from "@/components/auth/Auth.module.css";
import type { AuthModalReason } from "@/lib/auth-context";

const REASONS: AuthModalReason[] = ["profile", "save-design", "buy", "generate", "hall-finder"];

/** The post-auth destination, only when it stays on this site. Parsed the way
 *  the browser will parse it, so "/\host" or a tab after the slash can't
 *  turn into another origin. */
function sameSitePath(raw: string | null): string | null {
  if (!raw?.startsWith("/")) return null;
  const base = "https://dormscape.invalid";
  try {
    const url = new URL(raw, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

function LoginInner() {
  const params = useSearchParams();
  const rawReason = params.get("reason");
  const reason: AuthModalReason = REASONS.includes(rawReason as AuthModalReason)
    ? (rawReason as AuthModalReason)
    : "profile";
  const next = sameSitePath(params.get("next")) ?? "/plan";

  return <AuthForm reason={reason} next={next} initialMode={params.get("mode") === "login" ? "login" : "signup"} />;
}

// What an account keeps (decorative): three saved designs that take turns at the front.
const NOTES = [
  { color: "#2449ff", place: "Penn State · Atherton Hall", detail: "Minimalist · $650 budget", tag: "Saved", tone: "sv" },
  { color: "#c8834f", place: "Michigan · Alice Lloyd Hall", detail: "Cozy Aesthetic · 14 pieces", tag: "Shared", tone: "sh" },
  { color: "#ff4fa8", place: "UCLA · Dykstra Hall", detail: "Preppy · pick up where you left off", tag: "Edited", tone: "ed" },
] as const;

/** Log in / create account (design-handoff/v2 Login.dc.html): the form on plan
 *  paper beside the door hanger, swinging on its knob, with what an account keeps. */
export default function LoginPage() {
  return (
    <div className={`ds ${styles.page}`} data-anim="">
      <div className={styles.formSide}>
        <header className={styles.top}>
          <Wordmark />
          <Link href="/plan" className={styles.backLink}>
            Back to planning
          </Link>
        </header>
        <main id="page-content" tabIndex={-1} className={styles.main}>
          <div className={styles.mainInner}>
            <Suspense fallback={<div className={styles.fallback} aria-busy="true" />}>
              <LoginInner />
            </Suspense>
          </div>
        </main>
        <p className={styles.legal}>
          By continuing you agree to the <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>
        </p>
      </div>
      <aside className={styles.art}>
        <span className={styles.hanger}>
          <Image
            src="/redesign/site-login-door-hanger.jpg"
            alt="A yellow door hanger on a brass doorknob reading Planning in progress, knock later, with the dormscape logo"
            fill
            sizes="(max-width: 880px) 112vw, 56vw"
            loading="eager"
            fetchPriority="high"
          />
        </span>
        <div className={styles.stack} aria-hidden="true">
          <p className={styles.stackHead}>
            <i />
            Saved as you go
          </p>
          {NOTES.map((n, i) => (
            <div key={n.place} className={`${styles.saved} ${styles[`n${i + 1}`]}`} style={{ "--c": n.color } as React.CSSProperties}>
              <span className={styles.thumbnail}>
                <b />
              </span>
              <span>
                <strong>{n.place}</strong>
                <small>{n.detail}</small>
              </span>
              <span className={styles.noteTag} data-tone={n.tone}>
                {n.tag}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
