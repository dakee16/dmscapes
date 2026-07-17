import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import type { SavedRoomResponse } from "@/lib/api-types";

const ID_RE = /^[A-Za-z0-9_-]{1,21}$/;

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Shared rooms aren't available yet." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("saved_rooms")
    .select(
      "id, college_id, dorm_id, room_dimensions, style, budget, template_id, furniture_positions, selected_products, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("saved_rooms select failed:", error.message);
    return NextResponse.json(
      { error: "Couldn't load this room. Try again in a minute." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const room: SavedRoomResponse = {
    id: data.id,
    college_id: data.college_id,
    dorm_id: data.dorm_id,
    room_dimensions: data.room_dimensions,
    style: data.style,
    budget: Number(data.budget),
    template_id: data.template_id,
    furniture_positions: data.furniture_positions,
    selected_products: data.selected_products,
    created_at: data.created_at,
  };

  return NextResponse.json(room);
}
