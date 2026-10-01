"use client";
import { getBrowserClient } from "./supabase-browser";
import { usePlannerStore, type PlannerState } from "./store";
import type { Product } from "./types";
import type { SaveRoomRequest } from "./api-types";
import { productsFor, productById, tierForBudget, extrasFor } from "./catalog";
import { DEFAULT_PLANNING } from "./planning";
import { getSchool } from "./schools";

export class WorkspaceError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function workspaceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const client = getBrowserClient();
  const { data } = client ? await client.auth.getSession() : { data: { session: null } };
  if (!data.session) throw new WorkspaceError("Sign in to open your rooms.", 401);
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${data.session.access_token}` } });
  const body = await response.json();
  if (!response.ok) throw new WorkspaceError(body.error ?? "Couldn't save this change. Please try again.", response.status);
  return body as T;
}
export function currentProducts(state: PlannerState): Product[] {
  if (!state.style) return [];
  const core = state.style === "custom" ? state.customProducts ?? [] : [
    ...productsFor(state.style, tierForBudget(state.budget), state.room?.bedSize).map(p => productById(state.swaps[p.category] ?? "") ?? p),
    ...extrasFor(state.style),
  ];
  return [...core.filter(p => !(state.excluded ?? []).includes(p.category)), ...state.customItems];
}
export function currentSnapshot(state = usePlannerStore.getState()): SaveRoomRequest | null {
  if (!state.room || !state.style || !state.templateId || !state.furniture) return null;
  const cart = currentProducts(state), room = state.room;
  return {
    name: state.planning.name,
    college_id: state.college?.id ?? null, dorm_id: state.dorm?.id ?? null,
    room_dimensions: { length_ft: room.lengthFt, width_ft: room.widthFt, room_type: room.type, occupants: room.occupants,
      bed_size: room.bedSize, estimated: room.dimsEstimated, outline: room.outline, studio: room.studio,
      editor: { hiddenItemIds: state.hiddenItemIds, lockedItemIds: state.lockedItemIds, excluded: state.excluded ?? [],
        customItems: state.customItems, unplacedItemIds: state.unplacedItemIds, customProducts: state.customProducts,
        customVibe: state.customVibe, customMock: state.customMock, customRegenUsed: state.customRegenUsed, cartProducts: cart,
        planning: { ...state.planning, lastPanel: "shop" } } },
    style: state.style, budget: state.budget, template_id: state.templateId,
    furniture_positions: state.furniture, selected_products: Object.fromEntries(cart.map(p => [p.category, p.id])),
  };
}
export function loadSnapshot(snapshot: SaveRoomRequest) {
  const dims = snapshot.room_dimensions, editor = dims.editor;
  const school = snapshot.college_id ? getSchool(snapshot.college_id) : undefined;
  const dorm = school?.dorms.find(d => d.id === snapshot.dorm_id);
  usePlannerStore.setState({
    college: school ? { id: school.id, name: school.name } : null, dorm: dorm ? { id: dorm.id, name: dorm.name } : null,
    room: { lengthFt: dims.length_ft, widthFt: dims.width_ft, type: dims.room_type, occupants: dims.occupants,
      bedSize: dims.bed_size ?? "twin_xl", source: dims.outline ? "drawn" : school ? "catalog" : "manual",
      dimsEstimated: dims.estimated, outline: dims.outline, studio: dims.studio },
    style: snapshot.style, budget: snapshot.budget, templateId: snapshot.template_id, furniture: structuredClone(snapshot.furniture_positions),
    swaps: snapshot.selected_products ?? {}, excluded: editor?.excluded ?? null,
    planning: { ...DEFAULT_PLANNING, ...editor?.planning, name: snapshot.name ?? editor?.planning?.name ?? "My room" },
    hiddenItemIds: editor?.hiddenItemIds ?? [], lockedItemIds: editor?.lockedItemIds ?? [], customItems: editor?.customItems ?? [],
    unplacedItemIds: editor?.unplacedItemIds ?? [], customProducts: editor?.customProducts ?? null, customVibe: editor?.customVibe ?? null,
    customMock: editor?.customMock ?? false, customRegenUsed: editor?.customRegenUsed ?? false,
    selectedItemId: null, selectedCategory: null, hoveredCategory: null, checkHighlight: null, savedFingerprint: null,
  });
}
