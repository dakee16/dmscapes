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

  // Result-page cross-highlighting (transient UI, not persisted). Both the
  // canvas and the product list read/write these so either can light the other.
  /** Category under the cursor right now; clears on mouse-leave. */
  hoveredCategory: ProductCategory | null;
  /** Category pinned by a click; persists until toggled off or cleared. */
  selectedCategory: ProductCategory | null;
  /** Specific canvas item pinned by a click, the rotate controls' target. */
  selectedItemId: string | null;

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
  /** Rotate an item a quarter turn about its center (1 = CW, -1 = CCW). */
  rotateItem: (id: string, dir: 1 | -1) => void;
  setHoveredCategory: (category: ProductCategory | null) => void;
  /** Click behavior: same category toggles off, a new one replaces it. */
  toggleSelectedCategory: (category: ProductCategory) => void;
  /** Canvas item click: same item toggles off, a new one replaces the pin. */
  toggleSelectedItem: (id: string, category: ProductCategory | null) => void;
  /** Clear the pinned selection (e.g. clicking empty canvas). */
  clearSelectedCategory: () => void;
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
  hoveredCategory: null,
  selectedCategory: null,
  selectedItemId: null,
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
      rotateItem: (id, dir) =>
        set((s) => ({
          furniture:
            s.furniture?.map((f) => {
              if (f.id !== id) return f;
              // Quarter turn about the item's center. Footprint convention
              // matches components/canvas/geometry.ts: rotation mod 180
              // decides whether width/length swap axes (keep in sync).
              const rotation_deg = (f.rotation_deg + dir * 90 + 360) % 360;
              const swap = f.rotation_deg % 180 === 90;
              const w = swap ? f.length_ft : f.width_ft;
              const h = swap ? f.width_ft : f.length_ft;
              // New footprint is the transpose: keep the center, snap to the
              // half-foot grid, and clamp inside the room like a drag would.
              // An item too long to fit rotated pins at 0 and gets
              // red-flagged by the canvas's out-of-bounds check.
              const snap = (v: number) => Math.round(v * 2) / 2;
              let x_ft = snap(f.x_ft + (w - h) / 2);
              let y_ft = snap(f.y_ft + (h - w) / 2);
              if (s.room) {
                x_ft = Math.min(Math.max(x_ft, 0), Math.max(0, s.room.lengthFt - h));
                y_ft = Math.min(Math.max(y_ft, 0), Math.max(0, s.room.widthFt - w));
              }
              return { ...f, rotation_deg, x_ft, y_ft };
            }) ?? null,
        })),
      setHoveredCategory: (category) => set({ hoveredCategory: category }),
      toggleSelectedCategory: (category) =>
        set((s) => ({
          selectedCategory: s.selectedCategory === category ? null : category,
          // A product-tile pin is category-level; drop any stale item pin.
          selectedItemId: null,
        })),
      toggleSelectedItem: (id, category) =>
        set((s) =>
          s.selectedItemId === id
            ? { selectedItemId: null, selectedCategory: null }
            : { selectedItemId: id, selectedCategory: category }
        ),
      clearSelectedCategory: () => set({ selectedCategory: null, selectedItemId: null }),
      resetPlanner: () => set({ ...initial }),
    }),
    {
      name: "dormscape-planner",
      storage: createJSONStorage(() => sessionStorage),
      // Persist only the design data; the highlight fields are transient UI.
      partialize: (s) => ({
        college: s.college,
        dorm: s.dorm,
        room: s.room,
        style: s.style,
        budget: s.budget,
        templateId: s.templateId,
        furniture: s.furniture,
        swaps: s.swaps,
      }),
    }
  )
);
