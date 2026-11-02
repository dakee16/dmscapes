import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";

const ID_RE = /^[A-Za-z0-9_-]{1,21}$/;

/** Add one of your named designs to its hall's gallery, or take it out (lib/gallery.ts). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(request, "room-gallery", 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many changes. Give it a minute." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { gallery?: unknown } | null;
  if (!ID_RE.test(id) || typeof body?.gallery !== "boolean") {
    return NextResponse.json({ error: "That change looks off." }, { status: 400 });
  }
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Saved designs aren't available yet." }, { status: 503 });
  const { data, error } = await db
    .from("saved_rooms")
    .update({ gallery_at: body.gallery ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId)
    .not("name", "is", null)
    .not("dorm_id", "is", null)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "The hall gallery isn't switched on yet." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Only your own designs with a hall can go in a gallery." }, { status: 404 });
  return NextResponse.json({ gallery: body.gallery });
}
