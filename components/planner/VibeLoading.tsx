"use client";

import Generating from "@/components/plan-steps/Generating";
import { dimsOf, schoolLabel, usd, vibeMeta } from "@/components/plan-steps/room-model";
import { usePlannerStore } from "@/lib/store";

const noop = () => {};

/**
 * The custom-vibe wait (Create your own vibe, and its regeneration on the
 * result page): the same planning screen as the curated flow, held in its calm
 * loop until the caller unmounts it. Completion still comes from the real request.
 */
export default function VibeLoading({
  description = "",
  budget,
  regenerating = false,
}: {
  description?: string;
  budget?: number;
  regenerating?: boolean;
}) {
  const room = usePlannerStore((s) => s.room);
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  if (!room) return null;
  const brief = description.trim();
  const under = typeof budget === "number" ? ` that land under ${usd(budget)}` : "";
  return (
    <Generating
      room={room}
      summary={[schoolLabel(college), dorm?.name, brief ? `“${brief}”` : null, typeof budget === "number" ? usd(budget) : null]
        .filter(Boolean)
        .join(" · ")}
      eyebrow={regenerating ? "A fresh take on your vibe" : "From your words to your room"}
      measure={`Loaded your ${dimsOf(room.lengthFt, room.widthFt)} room with its standard furniture.`}
      imagine={brief ? `Finding real pieces for “${brief}”${under}.` : `Finding real pieces for your vibe${under}.`}
      picks={{ bedding: true, rug: true, lamp: true }}
      colors={vibeMeta("custom")!.dots}
      ready={false}
      onOpen={noop}
      skippable={false}
    />
  );
}
