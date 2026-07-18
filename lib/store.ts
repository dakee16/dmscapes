"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FurnitureItem, ProductCategory, SelectedRoom, StyleId } from "./types";

export interface PlannerState {
  // Step 1
  college: { id: string | null; name: string } | null;
  dorm: { id: string; name: string } | null;
  room: SelectedRoom | null;
  // Step 2
  style: StyleId | null;
  budget: number;
  // Step 3: canvas layout
  templateId: string | null;
  /** Current furniture positions (template copy, mutated by drag). */
  furniture: FurnitureItem[] | null;
  /** Product overrides from the swap modal: category -> product id. */
  swaps: Partial<Record<ProductCategory, string>>;

  setCollege: (college: PlannerState["college"]) => void;
  setDorm: (dorm: PlannerState["dorm"]) => void;
  setRoom: (room: SelectedRoom | null) => void;
  setStyle: (style: StyleId) => void;
  setBudget: (budget: number) => void;
  /** Called once on result-page load (or after re-match). Replaces the layout. */
  initLayout: (templateId: string, furniture: FurnitureItem[]) => void;
  moveItem: (id: string, xFt: number, yFt: number) => void;
  /** Restore template defaults (pass the template's original furniture). */
  resetLayout: (furniture: FurnitureItem[]) => void;
  swapProduct: (category: ProductCategory, productId: string) => void;
  /** Update a furniture item's footprint (e.g. swapped rug with new dims). */
  resizeItem: (id: string, widthFt: number, lengthFt: number) => void;
  resetPlanner: () => void;
}

const initial = {
  college: null,
  dorm: null,
  room: null,
  style: null,
  budget: 500,
  templateId: null,
  furniture: null,
  swaps: {},
} satisfies Partial<PlannerState>;

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      ...initial,
      setCollege: (college) => set({ college, dorm: null, room: null }),
      setDorm: (dorm) => set({ dorm, room: null }),
      setRoom: (room) => set({ room, templateId: null, furniture: null }),
      setStyle: (style) => set({ style, swaps: {} }),
      setBudget: (budget) => set({ budget, swaps: {} }),
      initLayout: (templateId, furniture) =>
        set({ templateId, furniture: furniture.map((f) => ({ ...f })) }),
      moveItem: (id, xFt, yFt) =>
        set((s) => ({
          furniture:
            s.furniture?.map((f) => (f.id === id ? { ...f, x_ft: xFt, y_ft: yFt } : f)) ?? null,
        })),
      resetLayout: (furniture) => set({ furniture: furniture.map((f) => ({ ...f })) }),
      swapProduct: (category, productId) =>
        set((s) => ({ swaps: { ...s.swaps, [category]: productId } })),
      resizeItem: (id, widthFt, lengthFt) =>
        set((s) => ({
          furniture:
            s.furniture?.map((f) =>
              f.id === id ? { ...f, width_ft: widthFt, length_ft: lengthFt } : f
            ) ?? null,
        })),
      resetPlanner: () => set({ ...initial }),
    }),
    {
      name: "dormscape-planner",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
