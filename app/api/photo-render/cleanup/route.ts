import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { removePhotoFiles } from "@/lib/photo-render";

export const runtime = "nodejs";

/**
 * Daily Vercel cron (vercel.json): room photos and their renders are deleted 14
 * days after the render (photo_renders.expires_at). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is turned away.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  let removed = 0;
  // ponytail: 10 batches of 500 a day; raise if renders ever outgrow it.
  for (let batch = 0; batch < 10; batch++) {
    const { data, error } = await db
      .from("photo_renders")
      .select("id, photo_path, render_path")
      .lt("expires_at", new Date().toISOString())
      .limit(500);
    if (error) return NextResponse.json({ error: error.message, removed }, { status: 500 });
    if (!data?.length) break;
    await removePhotoFiles(db, data.flatMap((r) => [r.photo_path, r.render_path]));
    const { error: deleteError } = await db.from("photo_renders").delete().in("id", data.map((r) => r.id));
    if (deleteError) return NextResponse.json({ error: deleteError.message, removed }, { status: 500 });
    removed += data.length;
  }
  return NextResponse.json({ removed });
}
