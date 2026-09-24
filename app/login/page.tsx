"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import BrandMark from "@/components/site/BrandMark";
import AuthForm from "@/components/auth/AuthForm";
import styles from "@/components/auth/Auth.module.css";
import type { AuthModalReason } from "@/lib/auth-context";

const REASONS: AuthModalReason[] = ["profile", "save-design", "buy", "generate"];

function LoginInner() {
  const params = useSearchParams();
  const rawReason = params.get("reason");
  const reason: AuthModalReason = REASONS.includes(rawReason as AuthModalReason)
    ? (rawReason as AuthModalReason)
    : "profile";
  const rawNext = params.get("next");
  // Only allow same-site relative paths as the post-auth destination.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/plan";

  return (
    <div className={styles.layout}>
      <div className={styles.formPanel}>
        <div className={styles.formWrap}>
          <AuthForm reason={reason} next={next} />
        </div>
      </div>
      <aside className={styles.welcomePanel} aria-label="Welcome to dormscape">
        <h2 className={styles.welcomeTitle}>Welcome to<br /><em>dormscape.</em></h2>
        <div className={styles.markPoster} aria-hidden="true">
          <BrandMark size={320} className={styles.mark} />
        </div>
      </aside>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative">
      <SiteHeader gridClassName="h-[26rem]" />
      <main id="page-content" tabIndex={-1} className="dm-page relative">
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <LoginInner />
        </Suspense>
      </main>
    </div>
  );
}
