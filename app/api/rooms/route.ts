import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { ALL_STYLE_IDS } from "@/lib/styles";
import type { SaveRoomRequest, SaveRoomResponse } from "@/lib/api-types";
import type { ClosetRect, FurnitureItem, Point, RoomOutline, WallOpening } from "@/lib/types";

// Accept every known style, including the retired Boho, so a legacy saved
// design reopened in the planner can still be re-saved. New designs can only
// pick a currently-selectable style, since Boho is gone from the picker.
const STYLE_IDS = ALL_STYLE_IDS;

function isFeet(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 4 && value <= 60;
}

function cleanId(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

/** Whitelist known FurnitureItem fields so arbitrary JSON never lands in the DB. */
function sanitizeFurniture(input: unknown): FurnitureItem[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 60) return null;
  const out: FurnitureItem[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;
    const f = raw as Record<string, unknown>;
    const id = cleanId(f.id, 60);
    if (!id) return null;
    for (const key of ["x_ft", "y_ft", "width_ft", "length_ft", "rotation_deg"]) {
      const n = f[key];
      if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 1000) return null;
    }
    out.push({
      id,
      type: typeof f.type === "string" ? f.type.slice(0, 60) : "unknown",
      label: typeof f.label === "string" ? f.label.slice(0, 120) : "",
      owner: typeof f.owner === "string" ? f.owner.slice(0, 20) : "shared",
      x_ft: f.x_ft as number,
      y_ft: f.y_ft as number,
      width_ft: f.width_ft as number,
      length_ft: f.length_ft as number,
      rotation_deg: f.rotation_deg as number,
      movable: Boolean(f.movable),
      built_in: Boolean(f.built_in),
      color_category:
        typeof f.color_category === "string" ? f.color_category.slice(0, 30) : "decor",
      ...(typeof f.product_category === "string"
        ? { product_category: f.product_category.slice(0, 40) }
        : {}),
    });
  }
  return out;
}

function sanitizeProducts(input: unknown): Record<string, string> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > 20) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (key.length > 40 || typeof value !== "string" || !value || value.length > 64) return null;
    out[key] = value;
  }
  return out;
}

/** A finite coordinate in feet, within a generous room bound. */
function isCoord(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -1 && n <= 120;
}

/**
 * Whitelist a hand-drawn room outline so only well-formed geometry lands in the
 * JSONB. Returns null on any malformed field so the caller can reject the save.
 */
function sanitizeOutline(input: unknown): RoomOutline | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  if (!Array.isArray(o.points) || o.points.length < 3 || o.points.length > 40) return null;
  const points: Point[] = [];
  for (const raw of o.points) {
    if (typeof raw !== "object" || raw === null) return null;
    const p = raw as Record<string, unknown>;
    if (!isCoord(p.x) || !isCoord(p.y)) return null;
    points.push({ x: p.x, y: p.y });
  }

  const openings: WallOpening[] = [];
  if (o.openings !== undefined) {
    if (!Array.isArray(o.openings) || o.openings.length > 20) return null;
    for (const raw of o.openings) {
      if (typeof raw !== "object" || raw === null) return null;
      const w = raw as Record<string, unknown>;
      if (w.kind !== "door" && w.kind !== "window") return null;
      if (!Number.isInteger(w.edge) || (w.edge as number) < 0 || (w.edge as number) >= points.length) return null;
      if (!isCoord(w.offset_ft) || typeof w.width_ft !== "number" || !(w.width_ft > 0 && w.width_ft <= 20)) return null;
      openings.push({ kind: w.kind, edge: w.edge as number, offset_ft: w.offset_ft as number, width_ft: w.width_ft });
    }
  }

  const closets: ClosetRect[] = [];
  if (o.closets !== undefined) {
    if (!Array.isArray(o.closets) || o.closets.length > 20) return null;
    for (const raw of o.closets) {
      if (typeof raw !== "object" || raw === null) return null;
      const c = raw as Record<string, unknown>;
      if (!isCoord(c.x_ft) || !isCoord(c.y_ft)) return null;
      if (typeof c.width_ft !== "number" || !(c.width_ft > 0 && c.width_ft <= 40)) return null;
      if (typeof c.depth_ft !== "number" || !(c.depth_ft > 0 && c.depth_ft <= 40)) return null;
      closets.push({ x_ft: c.x_ft, y_ft: c.y_ft, width_ft: c.width_ft, depth_ft: c.depth_ft });
    }
  }

  return { points, openings, closets };
}

export async function POST(request: Request) {
  const rl = rateLimit(request, "rooms", 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: SaveRoomRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const style = STYLE_IDS.includes(body.style) ? body.style : null;
  const budget =
    typeof body.budget === "number" && body.budget >= 200 && body.budget <= 1500
      ? body.budget
      : null;
  const templateId = cleanId(body.template_id, 100);
  const dims = body.room_dimensions ?? ({} as SaveRoomRequest["room_dimensions"]);
  const roomType = cleanId(dims.room_type, 60);
  const occupants =
    typeof dims.occupants === "number" && dims.occupants >= 1 && dims.occupants <= 8
      ? dims.occupants
      : null;
  const furniture = sanitizeFurniture(body.furniture_positions);
  const products = sanitizeProducts(body.selected_products);
  // Hand-drawn rooms include an outline; normal rooms don't. Present-but-invalid
  // is a corrupt save, so it fails validation below.
  const rawOutline = dims.outline;
  const outline = rawOutline == null ? null : sanitizeOutline(rawOutline);
  const outlineBad = rawOutline != null && outline === null;

  if (
    !style ||
    budget === null ||
    !templateId ||
    !roomType ||
    occupants === null ||
    !isFeet(dims.length_ft) ||
    !isFeet(dims.width_ft) ||
    !furniture ||
    !products ||
    outlineBad
  ) {
    return NextResponse.json(
      { error: "That design couldn't be saved. Some fields look off." },
      { status: 400 }
    );
  }

  // A `name` marks a "Save design" (owned, named); its absence is the anonymous
  // "copy share link" flow. When present it must be non-empty and belong to a
  // signed-in user, so the account library never collects orphaned rows.
  const userId = await getUserId(request);
  let name: string | null = null;
  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "That name looks off." }, { status: 400 });
    }
    name = body.name.trim().slice(0, 80);
    if (!name) {
      return NextResponse.json(
        { error: "Give your design a name to save it." },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { error: "Log in to save a design to your account." },
        { status: 401 }
      );
    }
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Saving isn't set up yet. Check back soon." },
      { status: 503 }
    );
  }

  // Saving is unlimited for every signed-in account, so a named "Save design" is
  // no longer metered: we just persist the row. (Only plan generation is metered,
  // handled elsewhere.)
  const id = nanoid(10);
  const { error } = await supabase.from("saved_rooms").insert({
    id,
    user_id: userId,
    name,
    college_id: cleanId(body.college_id, 80),
    dorm_id: cleanId(body.dorm_id, 80),
    room_dimensions: {
      length_ft: dims.length_ft,
      width_ft: dims.width_ft,
      room_type: roomType,
      occupants,
      estimated: dims.estimated === true,
      ...(outline ? { outline } : {}),
    },
    style,
    budget,
    template_id: templateId,
    furniture_positions: furniture,
    selected_products: products,
  });

  if (error) {
    console.error("saved_rooms insert failed:", error.message);
    return NextResponse.json(
      { error: "Couldn't save your design. Try again in a minute." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id } satisfies SaveRoomResponse, { status: 201 });
}
