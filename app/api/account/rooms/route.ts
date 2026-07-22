import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import type { AccountRoomSummary, AccountRoomsResponse } from "@/lib/api-types";

/** The signed-in user's *named* designs (anonymous share rows have no name). */
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Saved designs aren't available yet." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("saved_rooms")
    .select("id, name, college_id, dorm_id, room_dimensions, style, budget, created_at")
    .eq("user_id", userId)
    .not("name", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("account rooms select failed:", error.message);
    return NextResponse.json(
      { error: "Couldn't load your designs. Try again in a minute." },
      { status: 500 }
    );
  }

  const rooms: AccountRoomSummary[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    college_id: r.college_id,
    dorm_id: r.dorm_id,
    style: r.style,
    budget: Number(r.budget),
    room_type: r.room_dimensions?.room_type ?? "",
    created_at: r.created_at,
  }));

  return NextResponse.json({ rooms } satisfies AccountRoomsResponse);
}
