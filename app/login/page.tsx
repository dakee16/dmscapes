"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import RoomModel from "@/components/experience/RoomModel";
import AuthForm from "@/components/auth/AuthForm";
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
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-stretch gap-0 px-5 py-8 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:py-14">
      {/* LEFT: the form (priority on mobile) */}
      <div className="order-1 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <AuthForm reason={reason} next={next} />
        </div>
      </div>

      {/* RIGHT: promo, hidden on small screens so the form leads on mobile */}
      <div className="relative order-2 mt-10 flex flex-col justify-center border-t border-ink/10 pt-10 lg:mt-0 lg:border-0 lg:pt-0">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-highlight px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm">
          Your dorm, planned to the inch
        </span>
        <h1 className="dm-page-title mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Welcome to dorm<span className="text-amber">scape</span>.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Your exact room, laid out to the inch, with a shoppable list that fits your budget.
          Sign in and it&apos;s all waiting: your schools, your vibes, your saved designs.
        </p>
        <RoomModel className="dm-login-room" />
      </div>
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
