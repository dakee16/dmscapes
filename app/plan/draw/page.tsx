"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPaid } from "@/lib/plan";
import { track } from "@/lib/analytics";
import DrawScreenshot from "@/components/planner/DrawScreenshot";
import DrawnRoomsReuse from "@/components/planner/DrawnRoomsReuse";
import type { RoomDrawResult } from "@/components/planner/RoomDrawCanvas";

// react-konva can't render on the server, so load the editor client-side only.
const RoomDrawCanvas = dynamic(() => import("@/components/planner/RoomDrawCanvas"), {
  ssr: false,
  loading: () => <div className="h-[460px] w-full animate-pulse rounded-2xl bg-ink/5" />,
});

const OCC = [1, 2, 3, 4] as const;
const TYPE_FOR_OCC: Record<number, string> = { 1: "single", 2: "double", 3: "triple", 4: "quad" };

export default function DrawRoomPage() {
  const router = useRouter();
  const setRoom = usePlannerStore((s) => s.setRoom);
  const { profile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();
  const [started, setStarted] = useState(false);
  const [occupants, setOccupants] = useState(1);

  const paid = isPaid(profile);
  const drawLocked = !authLoading && !paid;

  function handleStart() {
    if (!paid) {
      track("draw_room_locked_clicked");
      openUpgrade("draw-room");
      return;
    }
    track("draw_room_started");
    setStarted(true);
  }

  function handleComplete(result: RoomDrawResult) {
    setRoom({
      type: TYPE_FOR_OCC[occupants] ?? "single",
      occupants,
      lengthFt: result.lengthFt,
      widthFt: result.widthFt,
      bedSize: "twin_xl",
      source: "drawn",
      outline: result.outline,
    });
    track("drawn_room_completed", {
      corners: result.outline.points.length,
      openings: result.outline.openings.length,
      closets: result.outline.closets.length,
      occupants,
    });
    router.push("/plan/style");
  }

  // Once started (desktop, Plus): the actual drawing tool + occupancy selector.
  if (started) {
    return (
      <div className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          Step 1 · Draw your room
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Trace your <span className="hl">walls</span>
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-ink">How many people?</span>
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-ink/10 bg-white p-1">
            {OCC.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOccupants(n)}
                aria-pressed={occupants === n}
                className={`h-9 w-10 rounded-lg text-sm font-semibold transition-colors ${
                  occupants === n ? "bg-cobalt text-white" : "text-ink hover:bg-ink/[0.06]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <RoomDrawCanvas onComplete={handleComplete} />
        </div>
      </div>
    );
  }

  // Landing (the "Draw" tab): heading, screenshot, description, and the button.
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
        Step 1 · Draw your room
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Draw your <span className="hl">exact room</span>
      </h1>

      <div className="mt-7 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <DrawScreenshot />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-cobalt px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white">
              New
            </span>
            {drawLocked && (
              <span className="inline-flex items-center rounded-full bg-highlight px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink">
                Plus
              </span>
            )}
          </div>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Not on our list, or an odd shape? Trace your floor plan wall by wall,
            even an L-shape, drop in the door, windows, and closets, and we fit a
            full layout to it in the next steps.
          </p>

          {/* Drawing needs a hovering cursor (live placement preview), so it's a
              desktop feature. Phones see a note instead of the button. */}
          <button
            type="button"
            onClick={handleStart}
            className="mt-6 hidden h-12 items-center gap-2 rounded-xl bg-cobalt px-7 text-base font-semibold text-white shadow-[0_14px_32px_-16px_rgba(43,78,255,0.7)] transition-all hover:-translate-y-0.5 hover:bg-cobalt-deep lg:inline-flex"
          >
            {drawLocked ? "Unlock drawing (Plus)" : "Draw your room"}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm leading-snug text-ink-soft lg:hidden">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2" y="4" width="20" height="14" rx="2" />
              <path d="M8 20h8M12 18v2" strokeLinecap="round" />
            </svg>
            Drawing your room works on a computer, where you can place walls with a
            cursor. Open this page on a laptop to start.
          </p>
        </div>
      </div>

      {/* Quick-start from a room this user has already drawn (signed-in only). */}
      <div className="mt-10">
        <DrawnRoomsReuse />
      </div>
    </div>
  );
}
