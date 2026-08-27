"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import StyleScene from "@/components/site/StyleScene";
import AuthForm from "@/components/auth/AuthForm";
import type { AuthModalReason } from "@/lib/auth-context";
import type { StyleId } from "@/lib/types";

const REASONS: AuthModalReason[] = ["profile", "save-design", "buy", "generate"];

// Layered promo tiles — the same floating line-art vibe language as the CYO
// section, giving the page depth without literal 3D.
const TILES: { id: StyleId; wrap: string; rotate: number; dur: string; delay: string; dist: string }[] = [
  { id: "cozy", wrap: "col-start-1 row-start-1 z-20", rotate: -5, dur: "6.6s", delay: "0s", dist: "10px" },
  { id: "gamer", wrap: "col-start-2 row-start-1 mt-10 z-10", rotate: 4, dur: "7.8s", delay: "0.5s", dist: "13px" },
  { id: "academia", wrap: "col-start-1 row-start-2 -mt-4 z-10", rotate: 3, dur: "7.1s", delay: "0.9s", dist: "9px" },
  { id: "preppy", wrap: "col-start-2 row-start-2 -mt-2 z-20", rotate: -4, dur: "8.3s", delay: "0.3s", dist: "12px" },
];

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

      {/* RIGHT: promo — hidden on small screens so the form leads on mobile */}
      <div className="relative order-2 mt-10 flex flex-col justify-center border-t border-ink/10 pt-10 lg:mt-0 lg:border-0 lg:pt-0">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-highlight px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm">
          Your dorm, planned to the inch
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Welcome to <span className="text-amber">dormscape</span>
          <span className="hl">.</span>
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Your exact room, laid out to the inch, with a shoppable list that fits your budget.
          Sign in and it&apos;s all waiting — your schools, your vibes, your saved designs.
        </p>
        {/* Floating layered illustration */}
        <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-4 sm:gap-5" aria-hidden="true">
          {TILES.map((t) => (
            <div
              key={t.id}
              className={`vibe-float overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_20px_44px_-24px_rgba(23,23,43,0.45)] ${t.wrap}`}
              style={{ transform: `rotate(${t.rotate}deg)`, ["--float-dur" as string]: t.dur, ["--float-delay" as string]: t.delay, ["--float-dist" as string]: t.dist }}
            >
              <StyleScene id={t.id} className="h-28 w-full sm:h-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative">
      <SiteHeader gridClassName="h-[26rem]" />
      <main className="relative">
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <LoginInner />
        </Suspense>
      </main>
    </div>
  );
}
