import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import type { ContactRequest, ContactResponse } from "@/lib/api-types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TO = process.env.CONTACT_TO_EMAIL ?? "info@dormscape.us";

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(request: Request) {
  const rl = rateLimit(request, "contact", 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: ContactRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: humans never see this field; bots that fill it get a quiet
  // success with no work done.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true } satisfies ContactResponse);
  }

  const fromEmail = cleanText(body.from_email, 254)?.toLowerCase() ?? null;
  const message = cleanText(body.message, 5000);
  const name = cleanText(body.name, 120);
  const phone = cleanText(body.phone, 40);

  if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email so we can reply." },
      { status: 400 }
    );
  }
  if (!message) {
    return NextResponse.json({ error: "Add a message before sending." }, { status: 400 });
  }

  // Notify the team (best-effort). The DB row below is the durable record
  // regardless of whether email is configured or delivery actually succeeds.
  const emailed = await sendEmail({
    to: TO,
    replyTo: fromEmail,
    subject: `New Dormscape message${name ? ` from ${name}` : ""}`,
    text:
      `From: ${name ?? "(no name given)"} <${fromEmail}>\n` +
      `Phone: ${phone ?? "(none given)"}\n` +
      `\n${message}\n`,
  });

  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.from("contact_submissions").insert({
      from_email: fromEmail,
      name,
      phone,
      message,
      emailed,
    });
    if (error) {
      console.error("contact_submissions insert failed:", error.message);
      // Only fail the request if we have neither a durable record nor a sent
      // email, otherwise the message reached us and the user shouldn't retry.
      if (!emailed) {
        return NextResponse.json(
          { error: "Couldn't send your message. Try again in a minute." },
          { status: 500 }
        );
      }
    }
  } else if (!emailed) {
    // Nothing configured (local/dev): accept so the page's success state works,
    // but there's no durable record and no email. 202 signals best-effort.
    return NextResponse.json({ ok: true } satisfies ContactResponse, { status: 202 });
  }

  return NextResponse.json({ ok: true } satisfies ContactResponse, { status: 201 });
}
