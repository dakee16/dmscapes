"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPaid } from "@/lib/plan";
import { track } from "@/lib/analytics";
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
  const [occupants, setOccupants] = useState(1);

  // Plus feature (Plus + Pro). A free/flex/logged-out visitor who reaches this
  // page (deep link, stale tab) gets the upgrade modal and is sent to Step 1.
  const paid = isPaid(profile);
  useEffect(() => {
    if (!authLoading && !paid) {
      openUpgrade("draw-room");
      router.replace("/plan");
    }
  }, [authLoading, paid, openUpgrade, router]);

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

  // Hold the frame until the gate resolves (avoids a flash for non-paid users).
  if (authLoading || !paid) {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
        Step 1 · Draw your room
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Draw your <span className="hl">exact room</span>
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Trace your floor plan wall by wall, even an L-shape, then drop in the door,
        windows, and closets. We&apos;ll fit a full layout to it in the next steps.
      </p>

      {/* Occupancy: how many beds the auto-layout should plan for. */}
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
