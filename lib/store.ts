"use client";

import { roomEditError } from "./room-editing";
import { bedSurfaceHeight, itemElevation, itemHeight, modelKind } from "./studio";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FurnitureItem, Product, ProductCategory, SelectedRoom, StyleId } from "./types";

export interface PlannerState {
  // Step 1
  college: { id: string | null; name: string } | null;
  dorm: { id: string; name: string } | null;
  room: SelectedRoom | null;
  // Step 2
  style: StyleId | null;
  budget: number;
  // Step 2 · "Create your own vibe" (custom pseudo-style). The vibe text is the
  // design's display name; the products come from the live pipeline, not the
  // catalog, so they're carried here (and persisted) for the result page, save,
  // and share. `customRegenUsed` tracks the one free regeneration per vibe.
  customVibe: string | null;
  customProducts: Product[] | null;
  /** True when customProducts are placeholder matches (PA-API not live yet). */
  customMock: boolean;
  customRegenUsed: boolean;
  // Step 3: canvas layout
  templateId: string | null;
  /** Current furniture positions (template copy, mutated by drag). */
  furniture: FurnitureItem[] | null;
  /** Product overrides from the swap modal: category -> product id. */
  swaps: Partial<Record<ProductCategory, string>>;
  /**
   * Categories currently parked in the "Things to add" panel (not in the active
   * cart). `null` until the result page seeds it from the budget-aware split.
   * Kept as a list of categories (not products) so it survives swaps.
   */
  excluded: ProductCategory[] | null;
  /** Canvas items the user has hidden (ghosted) via the toolbar. Distinct from
   *  `excluded`: a hidden item stays in the cart/list, it's just not drawn. */
  hiddenItemIds: string[];
  /** Canvas items locked against dragging via the toolbar. */
  lockedItemIds: string[];
  /** User-pasted "Add your own item" products (Part 2). Rendered in the cart
   *  and counted toward the budget, separate from the category-based auto-list. */
  customItems: Product[];
  /** Custom item ids not yet placed on the canvas (shown in the unplaced tray). */
  unplacedItemIds: string[];

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
  /** Store a completed custom-vibe generation (sets style to "custom"). */
  setCustomResult: (vibe: string, products: Product[], mock: boolean) => void;
  /** Mark the one free regeneration for the current vibe as spent. */
  markCustomRegen: () => void;
  /** Called once on result-page load (or after re-match). Replaces the layout. */
  initLayout: (templateId: string, furniture: FurnitureItem[]) => void;
  moveItem: (id: string, xFt: number, yFt: number) => void;
  /** Restore template defaults (pass the template's original furniture). */
  resetLayout: (furniture: FurnitureItem[]) => void;
  swapProduct: (category: ProductCategory, productId: string) => void;
  /** Seed the "Things to add" split (called once by the result page). */
  setExcluded: (categories: ProductCategory[]) => void;
  /** Move a category between the cart and the "Things to add" panel. */
  toggleExcluded: (category: ProductCategory) => void;
  /** Toggle a canvas item's hidden (ghosted) state; keeps it in the cart. */
  toggleHiddenItem: (id: string) => void;
  /** Toggle a canvas item's locked (undraggable) state. */
  toggleLockedItem: (id: string) => void;
  /** Update a furniture item's footprint (e.g. swapped rug with new dims). */
  resizeItem: (id: string, widthFt: number, lengthFt: number) => void;
  updateItem3D: (id: string, patch: Partial<Pick<FurnitureItem, "height_ft" | "elevation_ft" | "material_color" | "parent_id">>) => void;
  updateStudio: (patch: Partial<import("./studio").StudioSettings>) => void;
  updateOpenings: (outline: import("./types").RoomOutline) => void;
  updateRoomGeometry: (outline: import("./types").RoomOutline, origin?: import("./types").Point) => void;
  /** Rotate an item a quarter turn about its center (1 = CW, -1 = CCW). */
  rotateItem: (id: string, dir: 1 | -1) => void;
  setHoveredCategory: (category: ProductCategory | null) => void;
  /** Click behavior: same category toggles off, a new one replaces it. */
  toggleSelectedCategory: (category: ProductCategory) => void;
  /** Canvas item click: same item toggles off, a new one replaces the pin. */
  toggleSelectedItem: (id: string, category: ProductCategory | null) => void;
  /** Clear the pinned selection (e.g. clicking empty canvas). */
  clearSelectedCategory: () => void;
  /** Add a pasted item to the cart; place=true also drops it on the canvas. */
  addCustomItem: (product: Product, place: boolean) => void;
  /** Move an unplaced custom item onto the canvas (centered, then draggable). */
  placeCustomItem: (id: string) => void;
  /** Remove a custom item from the cart, canvas, and unplaced tray. */
  removeCustomItem: (id: string) => void;
  resetPlanner: () => void;
}

const initial = {
  college: null,
  dorm: null,
  room: null,
  style: null,
  budget: 500,
  customVibe: null,
  customProducts: null,
  customMock: false,
  customRegenUsed: false,
  templateId: null,
  furniture: null,
  swaps: {},
  excluded: null,
  hiddenItemIds: [],
  lockedItemIds: [],
  customItems: [],
  unplacedItemIds: [],
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
      setRoom: (room) =>
        set({ room, templateId: null, furniture: null, excluded: null, hiddenItemIds: [], lockedItemIds: [], customItems: [], unplacedItemIds: [] }),
      // Selecting a catalog style clears any custom-vibe result so its products
      // never leak into a normal plan.
      setStyle: (style) =>
        set({
          style,
          swaps: {},
          excluded: null,
          customVibe: null,
          customProducts: null,
          customMock: false,
          customRegenUsed: false,
          customItems: [],
          unplacedItemIds: [],
        }),
      setBudget: (budget) => set({ budget, swaps: {}, excluded: null }),
      setCustomResult: (vibe, products, mock) =>
        set({
          style: "custom",
          customVibe: vibe,
          customProducts: products,
          customMock: mock,
          swaps: {},
          excluded: null,
        }),
      markCustomRegen: () => set({ customRegenUsed: true }),
      initLayout: (templateId, furniture) =>
        set({ templateId, furniture: furniture.map((f) => ({ ...f })) }),
      moveItem: (id, xFt, yFt) => set(s => {
        const before=s.furniture?.find(f=>f.id===id);
        if(!before || !before.movable || s.lockedItemIds.includes(id))return {};
        const dx=xFt-before.x_ft,dy=yFt-before.y_ft;
        return {furniture:s.furniture?.map(f=>f.id===id?{...f,x_ft:xFt,y_ft:yFt}:
          f.parent_id===id?{...f,x_ft:f.x_ft+dx,y_ft:f.y_ft+dy}:f)??null};
      }),
      updateItem3D: (id, patch) => set(s => {
        const before=s.furniture?.find(f=>f.id===id);
        if(!before)return {};
        const after={...before,...patch},items=s.furniture!;
        const surface=(f:FurnitureItem)=>["bed","bunk"].includes(modelKind(f))?bedSurfaceHeight(f):itemHeight(f);
        const lift=itemElevation(after,items)-itemElevation(before,items);
        const surfaceChange=surface(after)-surface(before);
        return {furniture:items.map(f=>f.id===id?after:f.parent_id===id?
          {...f,elevation_ft:Math.max(0,itemElevation(f,items)+lift+(itemElevation(f,items)>0?surfaceChange:0))}:f)};
      }),
      updateStudio: patch => set(s => ({room:s.room?{...s.room,studio:{ceilingFt:8,floor:"oak",wallColor:"#f3eee4",lighting:"day",...s.room.studio,...patch}}:null})),
      updateRoomGeometry: (outline, origin = {x:0,y:0}) => set(s => {
        if(!s.room || roomEditError(outline) || !Number.isFinite(origin.x) || !Number.isFinite(origin.y))return {};
        const lengthFt=Math.max(...outline.points.map(p=>p.x)),widthFt=Math.max(...outline.points.map(p=>p.y));
        return {room:{...s.room,outline,lengthFt,widthFt,source:"drawn" as const,dimsEstimated:false},
          furniture:s.furniture?.map(f=>({...f,x_ft:f.x_ft-origin.x,y_ft:f.y_ft-origin.y}))??null};
      }),
      updateOpenings: outline => set(s => ({room:s.room?{...s.room,outline}:null})),
      resetLayout: (furniture) =>
        set({ furniture: furniture.map((f) => ({ ...f })), hiddenItemIds: [], lockedItemIds: [] }),
      swapProduct: (category, productId) =>
        set((s) => ({ swaps: { ...s.swaps, [category]: productId } })),
      setExcluded: (categories) => set({ excluded: [...categories] }),
      toggleExcluded: (category) =>
        set((s) => {
          const current = s.excluded ?? [];
          return {
            excluded: current.includes(category)
              ? current.filter((c) => c !== category)
              : [...current, category],
          };
        }),
      toggleHiddenItem: (id) =>
        set((s) => ({
          hiddenItemIds: s.hiddenItemIds.includes(id)
            ? s.hiddenItemIds.filter((x) => x !== id)
            : [...s.hiddenItemIds, id],
        })),
      toggleLockedItem: (id) =>
        set((s) => ({
          lockedItemIds: s.lockedItemIds.includes(id)
            ? s.lockedItemIds.filter((x) => x !== id)
            : [...s.lockedItemIds, id],
        })),
      resizeItem: (id, widthFt, lengthFt) =>
        set((s) => ({
          furniture:
            s.furniture?.map((f) =>
              f.id === id ? { ...f, width_ft: widthFt, length_ft: lengthFt } : f
            ) ?? null,
        })),
      rotateItem: (id, dir) => set(s => {
        const item=s.furniture?.find(f=>f.id===id);
        if(!item || !item.movable || s.lockedItemIds.includes(id))return {};
        const swapped=item.rotation_deg%180===90;
        const w=swapped?item.length_ft:item.width_ft,h=swapped?item.width_ft:item.length_ft;
        const rotation_deg=(item.rotation_deg+dir*90+360)%360;
        let x_ft=Math.round((item.x_ft+(w-h)/2)*2)/2,y_ft=Math.round((item.y_ft+(h-w)/2)*2)/2;
        if(s.room){x_ft=Math.min(Math.max(x_ft,0),Math.max(0,s.room.lengthFt-h));y_ft=Math.min(Math.max(y_ft,0),Math.max(0,s.room.widthFt-w));}
        const cx=item.x_ft+w/2,cy=item.y_ft+h/2,nx=x_ft+h/2,ny=y_ft+w/2;
        return {furniture:s.furniture?.map(f=>{
          if(f.id===id)return {...f,rotation_deg,x_ft,y_ft};
          if(f.parent_id!==id)return f;
          const sw=f.rotation_deg%180===90,cw=sw?f.length_ft:f.width_ft,ch=sw?f.width_ft:f.length_ft;
          const dx=f.x_ft+cw/2-cx,dy=f.y_ft+ch/2-cy;
          return {...f,rotation_deg:(f.rotation_deg+dir*90+360)%360,x_ft:nx-dir*dy-ch/2,y_ft:ny+dir*dx-cw/2};
        })??null};
      }),
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
      addCustomItem: (product, place) =>
        set((s) => {
          const customItems = s.customItems.some((x) => x.id === product.id)
            ? s.customItems
            : [...s.customItems, product];
          if (place) {
            const w = 2, l = 2;
            const x = s.room ? Math.min(1, Math.max(0, s.room.lengthFt - l)) : 1;
            const y = s.room ? Math.min(1, Math.max(0, s.room.widthFt - w)) : 1;
            const item: FurnitureItem = {
              id: product.id, type: "custom", label: product.name.slice(0, 20),
              owner: "student", x_ft: x, y_ft: y, width_ft: w, length_ft: l,
              rotation_deg: 0, movable: true, built_in: false,
              color_category: "accent", product_category: product.category,
            };
            const has = (s.furniture ?? []).some((f) => f.id === product.id);
            return {
              customItems,
              furniture: has ? s.furniture : [...(s.furniture ?? []), item],
              unplacedItemIds: s.unplacedItemIds.filter((id) => id !== product.id),
            };
          }
          return {
            customItems,
            unplacedItemIds: s.unplacedItemIds.includes(product.id)
              ? s.unplacedItemIds
              : [...s.unplacedItemIds, product.id],
          };
        }),
      placeCustomItem: (id) =>
        set((s) => {
          const p = s.customItems.find((x) => x.id === id);
          if (!p) return {} as Partial<PlannerState>;
          const w = 2, l = 2;
          const x = s.room ? Math.max(0, (s.room.lengthFt - l) / 2) : 1;
          const y = s.room ? Math.max(0, (s.room.widthFt - w) / 2) : 1;
          const item: FurnitureItem = {
            id, type: "custom", label: p.name.slice(0, 20), owner: "student",
            x_ft: x, y_ft: y, width_ft: w, length_ft: l, rotation_deg: 0,
            movable: true, built_in: false, color_category: "accent",
            product_category: p.category,
          };
          const has = (s.furniture ?? []).some((f) => f.id === id);
          return {
            furniture: has ? s.furniture : [...(s.furniture ?? []), item],
            unplacedItemIds: s.unplacedItemIds.filter((x) => x !== id),
          };
        }),
      removeCustomItem: (id) =>
        set((s) => ({
          customItems: s.customItems.filter((p) => p.id !== id),
          furniture: (s.furniture ?? []).filter((f) => f.id !== id),
          unplacedItemIds: s.unplacedItemIds.filter((x) => x !== id),
        })),
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
        customVibe: s.customVibe,
        customProducts: s.customProducts,
        customMock: s.customMock,
        customRegenUsed: s.customRegenUsed,
        templateId: s.templateId,
        furniture: s.furniture,
        swaps: s.swaps,
        excluded: s.excluded,
        hiddenItemIds: s.hiddenItemIds,
        lockedItemIds: s.lockedItemIds,
        customItems: s.customItems,
        unplacedItemIds: s.unplacedItemIds,
      }),
    }
  )
);
