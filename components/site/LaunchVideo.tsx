"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInView } from "framer-motion";
import Reveal from "@/components/site/Reveal";
import { useExperienceMotion } from "@/components/experience/MotionProvider";

/**
 * Homepage launch film: the pitch on the left, the 30 second walkthrough on the
 * right. It starts muted on its own once the clip is on screen and pauses when
 * it leaves; the viewer can turn the sound on. When site motion is paused
 * (the toggle, or prefers-reduced-motion) it never autoplays and shows the
 * native controls instead.
 */
export default function LaunchVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(videoRef, { amount: 0.4 });
  const { paused } = useExperienceMotion();
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (paused) return;
    if (inView) void video.play().catch(() => {});
    else video.pause();
  }, [inView, muted, paused]);

  return (
    <section className="dm-launch mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <Reveal>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            The 30 second tour
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Watch a dorm <span className="hl">come together.</span>
          </h2>
          <Link
            href="/plan"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
          >
            Plan my room
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </Reveal>

        <Reveal>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.03] shadow-[0_18px_44px_-30px_rgba(23,23,43,0.5)]">
            <video
              ref={videoRef}
              src="/videos/dormscape-launch.mp4"
              poster="/videos/dormscape-launch-poster.jpg"
              title="Dormscape in 30 seconds"
              loop
              muted
              playsInline
              preload="metadata"
              controls={paused}
              className="h-full w-full bg-black object-contain"
            />
            {!paused && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-pressed={!muted}
                aria-label={muted ? "Unmute video" : "Mute video"}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-ink/70 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur transition-colors hover:bg-ink/85"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H3v6h3l5 4V5z" />
                  {muted ? (
                    <path d="M17 9l4 6m0-6l-4 6" />
                  ) : (
                    <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
                  )}
                </svg>
                {muted ? "Sound off" : "Sound on"}
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
