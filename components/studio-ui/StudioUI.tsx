"use client";

import { createContext, useContext } from "react";
import type { FurnitureItem, Product } from "@/lib/types";
import { furnitureCategory } from "@/lib/highlight";
import type { ListEntry } from "./list";

/**
 * Shared UI state between the plan canvas and the shopping list on the result
 * page: numbered pins, the swap sheet and its canvas ghost. Transient UI only;
 * nothing here is saved. RoomCanvas reads it when present (null elsewhere).
 */
export interface SwapGhost {
  product: Product;
  /** The pieces as they would be after the swap (new footprint, same spot). */
  items: FurnitureItem[];
  /** Current pieces the swap would replace (drawn faded). */
  replaces: string[];
  /** No new placement warnings for the swapped pieces. */
  fits: boolean;
}

export interface StudioUIValue {
  /** The planner result page, or the same studio inside a My Room workspace. */
  variant: "planner" | "workspace";
  entries: ListEntry[];
  entryFor: (item: FurnitureItem) => ListEntry | undefined;
  swapTarget: Product | null;
  openSwap: (product: Product) => void;
  closeSwap: () => void;
  ghost: SwapGhost | null;
  previewSwap: (product: Product | null) => void;
  applySwap: (next: Product) => void;
  remove: (entry: ListEntry) => void;
  addOwn: () => void;
  ownLocked: boolean;
  /** Phone bottom sheet: just the budget bar, peeking with the first pieces, or pulled up to the full list. */
  sheet: "min" | "peek" | "full";
  setSheet: (sheet: "min" | "peek" | "full") => void;
  /** The "Add more" section of the list (pieces not in the cart yet). */
  addMoreOpen: boolean;
  setAddMoreOpen: (open: boolean) => void;
  /** Bring the "Add more" section into view (rail "Add a piece"). */
  showAddMore: () => void;
}

export const StudioUIContext = createContext<StudioUIValue | null>(null);
export const useStudioUI = () => useContext(StudioUIContext);

/** Which list entry a canvas piece belongs to: its product, or its category. */
export function entryMatcher(entries: ListEntry[]) {
  const byId = new Map(entries.map((e) => [e.product.id, e]));
  const byCategory = new Map(entries.filter((e) => !e.custom).map((e) => [e.product.category, e]));
  return (item: FurnitureItem): ListEntry | undefined => {
    if (item.product_id && byId.has(item.product_id)) return byId.get(item.product_id);
    if (byId.has(item.id)) return byId.get(item.id);
    // Dorm-provided pieces only carry a list number when the list dresses them (bedding on the bed).
    if (item.built_in || item.inventory) return item.type === "bed" ? byCategory.get("bedding") : undefined;
    const category = furnitureCategory(item);
    return category ? byCategory.get(category) : undefined;
  };
}
