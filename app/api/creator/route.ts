import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { applyAsCreator, creatorStatus, profileLink } from "@/lib/creators";

export const runtime = "nodejs";

const NOT_READY = "Creator applications aren't switched on yet. Check back soon.";
const OWNER = process.env.CONTACT_TO_EMAIL ?? "info@dormscape.us";

/** Your creator status: none, pending (with your bio code), approved (with your code), rejected. */
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  try {
    return NextResponse.json(await creatorStatus(db, userId));
  } catch {
    return NextResponse.json({ error: NOT_READY }, { status: 503 });
  }
}

/** Apply as a creator. The owner is emailed to review it. */
export async function POST(request: Request) {
  const rl = rateLimit(request, "creator-apply", 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many tries. Give it a while." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to apply." }, { status: 401 });
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const result = await applyAsCreator(db, userId, body ?? {});
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const s = result.status;
    if (result.isNew && s.platform && s.handle) {
      await sendEmail({
        to: OWNER,
        subject: `Creator application: @${s.handle} on ${s.platform === "tiktok" ? "TikTok" : "Instagram"}`,
        text:
          `@${s.handle} applied as a dormscape creator with ${s.followers?.toLocaleString("en-US")} followers.\n\n` +
          `1. Open ${profileLink(s.platform, s.handle)}\n` +
          `2. Check the follower count, and that the bio shows ${s.verifyCode}\n` +
          `3. In the Supabase SQL editor, run one of:\n` +
          `   update public.creators set status = 'approved' where handle = '${s.handle}';\n` +
          `   update public.creators set status = 'rejected' where handle = '${s.handle}';\n`,
      }).catch((e) => console.error("creator application email failed", e));
    }
    return NextResponse.json(s);
  } catch {
    return NextResponse.json({ error: NOT_READY }, { status: 503 });
  }
}
