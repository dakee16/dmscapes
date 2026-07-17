import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const source = typeof body.source === "string" ? body.source.slice(0, 64) : "unknown";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Signups aren't open yet. Check back soon." },
      { status: 503 }
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("waitlist").insert({ email, source });

  // 23505 = unique violation: they're already signed up, which is a success
  if (error && error.code !== "23505") {
    console.error("waitlist insert failed:", error.message);
    return NextResponse.json(
      { error: "Couldn't save your email. Try again in a minute." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
