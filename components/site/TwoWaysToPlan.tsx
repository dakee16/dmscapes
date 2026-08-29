"use client";

import { useState } from "react";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";

/**
 * A screen-recording slot. Shows a placeholder until the mp4 exists at `src`
 * (public/videos/...): a 404 fires onError and we show the placeholder; once the
 * file is added it plays in place, no code change needed.
 */
function WalkthroughVideo({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.03] shadow-[0_18px_44px_-30px_rgba(23,23,43,0.5)]">
      {!failed ? (
        <video
          src={src}
          title={title}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full bg-black object-contain"
        />
      ) : (
        <div className="grid-paper absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-ink-soft">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 bg-white/80 text-cobalt shadow-sm">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
              Walkthrough coming soon
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const WAYS = [
  {
    tag: "Already measured",
    title: "We know your room, just plan",
    body: "Pick your school and building and your exact dimensions, bed size, and window are already in. Skip straight to picking a vibe.",
    src: "/videos/plan-known-room.mp4",
    href: "/plan",
    cta: "Find my school",
  },
  {
    tag: "Plus",
    title: "Not on the list? Make your own",
    body: "Sketch your exact floor plan wall by wall, even an L-shape, drop in the door, windows, and closets, and we fit a full layout to it.",
    src: "/videos/draw-your-own-room.mp4",
    href: "/plan/draw",
    cta: "Draw your room",
  },
] as const;

/**
 * Homepage section under "How it works": the two entry paths side by side,
 * each with a short pitch and a walkthrough video slot.
 */
export default function TwoWaysToPlan() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
      <Reveal className="text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          Two ways to start
        </p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your room, <span className="hl">either way.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          Most rooms are already in our data. If yours is not, or it has an odd
          shape, draw it yourself in a minute.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
        {WAYS.map((w) => (
          <Reveal key={w.title}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                {w.tag}
              </span>
            </div>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              {w.title}
            </h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
              {w.body}
            </p>
            <div className="mt-5">
              <WalkthroughVideo src={w.src} title={w.title} />
            </div>
            <Link
              href={w.href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
            >
              {w.cta}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
