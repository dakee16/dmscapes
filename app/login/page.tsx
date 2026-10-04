"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Wordmark from "@/components/site/Wordmark";
import AuthForm from "@/components/auth/AuthForm";
import styles from "@/components/auth/Auth.module.css";
import type { AuthModalReason } from "@/lib/auth-context";

const REASONS: AuthModalReason[] = ["profile", "save-design", "buy", "generate"];

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

  return <AuthForm reason={reason} next={next} />;
}

/** Log in / create account (design-handoff/designs/site/Login): the form on
 *  paper beside a door hanger that reads "planning in progress". */
export default function LoginPage() {
  return (
    <div className={`ds ${styles.page}`}>
      <div className={styles.formSide}>
        <header className={styles.top}>
          <Wordmark />
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
        <Image
          src="/redesign/site-login-door-hanger.jpg"
          alt="A yellow door hanger on a brass doorknob reading Planning in progress, knock later, with the dormscape logo"
          fill
          sizes="(max-width: 899px) 100vw, 50vw"
          loading="eager"
          fetchPriority="high"
        />
      </aside>
    </div>
  );
}
