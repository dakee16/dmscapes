"use client";

import { roomEditError } from "./room-editing";
import { footprint, normalizeRotation, rotateFurniture } from "@/components/canvas/geometry";
import { bedSurfaceHeight, itemElevation, itemHeight, modelKind, roomOutline } from "./studio";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FurnitureItem, Product, ProductCategory, SelectedRoom, StyleId } from "./types";
import { DEFAULT_PLANNING, OWNER_COLORS, type PlanningDetails } from "./planning";
import { FURNITURE_LIBRARY, findFreePosition, newPiece } from "./furniture-library";
import { furnitureCategory } from "./highlight";
import { plannerStorage } from "./planner-storage";

export interface PlannerState {
  planning: PlanningDetails;
  checkHighlight: {points:import("./types").Point[];label:string}|null;
  savedFingerprint: string | null;
  savedByUserId: string | null;
  updatePlanning: (patch:Partial<PlanningDetails>)=>void;
  startManual: (empty?:boolean)=>void;
  addLibraryPiece: (key:string)=>string|null;
  updateInventoryItem: (id:string,patch:Partial<FurnitureItem>)=>void;
  duplicateItem: (id:string)=>string|null;
  removeInventoryItem: (id:string)=>void;
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
  plannerView: "2d" | "3d";
  setPlannerView: (view: "2d" | "3d") => void;
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
  updateOpenings: (openings: import("./types").WallOpening[]) => string | null;
  updateRoomGeometry: (outline: import("./types").RoomOutline, origin?: import("./types").Point) => void;
  /** Rotate an item a quarter turn about its center (1 = CW, -1 = CCW). */
  rotateItem: (id: string, dir: 1 | -1) => void;
  /** Set any angle in degrees, preserving the center and attached accessories. */
  setItemRotation: (id: string, degrees: number) => void;
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
  planning: DEFAULT_PLANNING,
  checkHighlight: null,
  savedFingerprint: null,
  savedByUserId: null,
  plannerView: "2d",
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
    (set, get) => ({
      ...initial,
      updatePlanning: patch=>set(s=>({planning:{...s.planning,...patch}})),
      startManual: (empty=false)=>set(s=>({style:"minimalist",customVibe:null,customProducts:null,swaps:{},excluded:null,
        planning:{...DEFAULT_PLANNING,mode:"manual",roommates:Array.from({length:s.room?.occupants??1},(_,i)=>({id:`person-${i+1}`,name:i===0?"You":`Roommate ${i+1}`,color:OWNER_COLORS[i%OWNER_COLORS.length]}))},
        furniture:empty?[]:null,templateId:empty?"manual-empty":null,customItems:[],unplacedItemIds:[],hiddenItemIds:[],lockedItemIds:[],selectedItemId:null,savedFingerprint:null})),
      addLibraryPiece: key=>{
        const s=get(),piece=FURNITURE_LIBRARY.find(p=>p.key===key);if(!piece||!s.room||(s.furniture?.length??0)>=60)return null;
        const id=`piece-${crypto.randomUUID()}`,item=newPiece(piece,s.room,s.furniture??[],id);
        const firstBed=piece.type==="bed"&&!s.furniture?.some(f=>["bed","bunk"].includes(modelKind(f)));
        const bedSize=piece.key==="full"?"full":piece.key==="twin"?"twin":"twin_xl";
        set({furniture:[...(s.furniture??[]),item],selectedItemId:id,selectedCategory:null,...(firstBed?{room:{...s.room,bedSize}}:{})});return id;
      },
      updateInventoryItem: (id,patch)=>set(s=>{const before=s.furniture?.find(f=>f.id===id);if(!before||Object.entries(patch).every(([k,v])=>before[k as keyof FurnitureItem]===v))return {};
        const after={...before,...patch,id:before.id},surface=(f:FurnitureItem)=>["bed","bunk"].includes(modelKind(f))?bedSurfaceHeight(f):itemHeight(f),lift=surface(after)-surface(before);
        return {furniture:s.furniture!.map(f=>f.id===id?after:f.parent_id===id&&lift&&itemElevation(f,s.furniture!)>0?{...f,elevation_ft:Math.max(0,itemElevation(f,s.furniture!)+lift)}:f)};
      }),
      duplicateItem: id=>{
        const s=get(),item=s.furniture?.find(f=>f.id===id);if(!item||!s.room||!item.movable||(s.furniture?.length??0)>=60)return null;
        const nextId=`piece-${crypto.randomUUID()}`,copy={...item,id:nextId,label:item.label+" copy",inventory:true,parent_id:undefined,product_id:undefined,product_category:undefined};
        const placed=findFreePosition(copy,s.room,s.furniture??[])??{...copy,x_ft:item.x_ft+.5,y_ft:item.y_ft+.5};
        set({furniture:[...s.furniture!,placed],selectedItemId:nextId,selectedCategory:null});return nextId;
      },
      removeInventoryItem: id=>set(s=>{const item=s.furniture?.find(f=>f.id===id),category=item&&!item.inventory&&!item.built_in?furnitureCategory(item):null;
        return {furniture:s.furniture?.filter(f=>f.id!==id).map(f=>f.parent_id===id?{...f,parent_id:undefined,elevation_ft:0}:f)??null,
        customItems:s.customItems.filter(p=>p.id!==id),unplacedItemIds:s.unplacedItemIds.filter(x=>x!==id),
        excluded:category&&!s.customItems.some(p=>p.id===id)?[...new Set([...(s.excluded??[]),category])]:s.excluded,
        hiddenItemIds:s.hiddenItemIds.filter(x=>x!==id),lockedItemIds:s.lockedItemIds.filter(x=>x!==id),selectedItemId:null,selectedCategory:null};}),
      setPlannerView: (plannerView) => set({ plannerView }),
      setCollege: (college) => set({ college, dorm: null, room: null }),
      setDorm: (dorm) => set({ dorm, room: null }),
      setRoom: (room) =>
        set({ room, templateId: null, furniture: null, excluded: null, hiddenItemIds: [], lockedItemIds: [], customItems: [], unplacedItemIds: [],planning:{...DEFAULT_PLANNING},savedFingerprint:null }),
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
        }),
      setBudget: (budget) => set({ budget, swaps: {}, excluded: null }),
      setCustomResult: (vibe, products, mock) =>
        set({
          style: "custom",
          planning: {...get().planning,mode:"generated"},
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
      updateOpenings: openings => {
        const room=get().room;
        if(!room)return "Choose a room first.";
        const outline={...roomOutline(room),openings},error=roomEditError(outline);
        if(!error)set({room:{...room,outline}});
        return error;
      },
      resetLayout: (furniture) =>
        set({ furniture: furniture.map((f) => ({ ...f })), selectedItemId:null, selectedCategory:null }),
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
      rotateItem: (id, dir) => {
        const item = get().furniture?.find(f => f.id === id);
        if (item) get().setItemRotation(id, item.rotation_deg + dir * 90);
      },
      setItemRotation: (id, degrees) => set(s => {
        const item=s.furniture?.find(f=>f.id===id);
        if(!item || !item.movable || s.lockedItemIds.includes(id) || !Number.isFinite(degrees))return {};
        const delta=normalizeRotation(degrees)-normalizeRotation(item.rotation_deg);
        if(!delta)return {};
        const b=footprint(item),pivot={x:b.x+b.w/2,y:b.y+b.h/2};
        return {furniture:s.furniture!.map(f=>f.id===id||f.parent_id===id?rotateFurniture(f,delta,pivot):f)};
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
            const w = product.width_ft || 2, l = product.length_ft || 2;
            const x = s.room ? Math.min(1, Math.max(0, s.room.lengthFt - l)) : 1;
            const y = s.room ? Math.min(1, Math.max(0, s.room.widthFt - w)) : 1;
            const item: FurnitureItem = {
              id: product.id, type: "custom", label: product.name.slice(0, 20),
              owner: "student", x_ft: x, y_ft: y, width_ft: w, length_ft: l,
              rotation_deg: 0, movable: true, built_in: false,
              color_category: "accent", product_category: product.category,
              product_id:product.id,dimensions_source:product.width_ft&&product.length_ft?"product":"generic",
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
          const w = p.width_ft || 2, l = p.length_ft || 2;
          const x = s.room ? Math.max(0, (s.room.lengthFt - l) / 2) : 1;
          const y = s.room ? Math.max(0, (s.room.widthFt - w) / 2) : 1;
          const item: FurnitureItem = {
            id, type: "custom", label: p.name.slice(0, 20), owner: "student",
            x_ft: x, y_ft: y, width_ft: w, length_ft: l, rotation_deg: 0,
            movable: true, built_in: false, color_category: "accent",
            product_category: p.category,
            product_id:p.id,dimensions_source:p.width_ft&&p.length_ft?"product":"generic",
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
      resetPlanner: () => {plannerStorage.removeItem("dormscape-planner");set({ ...initial });},
    }),
    {
      name: "dormscape-planner",
      storage: createJSONStorage(() => plannerStorage),
      // Persist only the design data; the highlight fields are transient UI.
      partialize: (s) => ({
        planning: s.planning,
        savedFingerprint:s.savedFingerprint,
        savedByUserId:s.savedByUserId,
        plannerView: s.plannerView,
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
