"use client";

import { useRouter } from "next/navigation";
import { usePlannerStore } from "@/lib/store";
import { getSchool } from "@/lib/schools";
import { track } from "@/lib/analytics";
import type { FurnitureItem, ProductCategory, StyleId } from "@/lib/types";

export interface PlannerSeed {
  college_id: string | null;
  dorm_id: string | null;
  length_ft: number;
  width_ft: number;
  room_type: string;
  occupants: number | null;
  style: StyleId;
  budget: number;
  template_id: string;
  furniture: FurnitureItem[];
  /** Saved product picks (category -> product id); restored as swaps. */
  products: Partial<Record<ProductCategory, string>> | null;
}

/**
 * Wraps a saved design's layout preview: clicking it loads the design back
 * into the planner store and opens the result page, so the owner (or anyone
 * with the share link) can keep editing from where the save left off.
 */
export default function OpenInPlanner({
  seed,
  className,
  children,
}: {
  seed: PlannerSeed;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleOpen() {
    const school = seed.college_id ? getSchool(seed.college_id) : undefined;
    const dorm = school?.dorms.find((d) => d.id === seed.dorm_id);
    const roomMeta = dorm?.rooms.find((r) => r.type === seed.room_type);
    usePlannerStore.setState({
      college: school ? { id: school.id, name: school.name } : null,
      dorm: dorm ? { id: dorm.id, name: dorm.name } : null,
      room: {
        type: seed.room_type,
        occupants: seed.occupants ?? roomMeta?.occupants ?? 1,
        lengthFt: seed.length_ft,
        widthFt: seed.width_ft,
        // bed size isn't stored on saved rooms; recover it from the school
        // catalog when possible, else the near-universal dorm default.
        bedSize: roomMeta?.bed_size ?? "twin_xl",
        source: school ? "catalog" : "manual",
      },
      style: seed.style,
      budget: seed.budget,
      templateId: seed.template_id,
      furniture: seed.furniture.map((f) => ({ ...f })),
      swaps: seed.products ?? {},
      hoveredCategory: null,
      selectedCategory: null,
      selectedItemId: null,
    });
    track("saved_design_opened");
    router.push("/plan/result");
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      title="Open this design in the planner"
      className={className}
    >
      {children}
    </button>
  );
}
