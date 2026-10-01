import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { boundedJson, sameOrigin } from "@/lib/request-body";
import { REPORT_CATEGORIES, reportPath } from "@/lib/reports";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const reply = (body: object, status: number) => NextResponse.json(body, { status, headers });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Submit your report from Dormscape." }, 403);
  const limit = rateLimit(request, "reports", 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many reports. Please wait a few minutes." }, {
    status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSec) },
  });
  const body = await boundedJson(request, 24_000);
  if (!body) return reply({ error: "Invalid report. Please shorten your message and try again." }, 400);
  if (typeof body.website === "string" && body.website.trim()) return reply({ error: "We couldn't submit this report. Contact info@dormscape.us for help." }, 400);
  const category = REPORT_CATEGORIES.find(item => item.value === body.category);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const page = reportPath(body.page_path);
  if (!category || description.length < 20 || description.length > 5000) return reply({ error: "Choose a category and describe the issue in 20 to 5,000 characters." }, 400);
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return reply({ error: "Enter a valid reply email, or leave it blank." }, 400);
  const id = randomUUID();
  let stored = false;
  try {
    const db = getServiceClient();
    if (db) {
      const userId = await getUserId(request);
      const result = await db.from("site_reports").insert({ id, user_id: userId, category: category.value, description, email: email || null, page_path: page });
      stored = !result.error;
      if (result.error) console.error("report storage failed", result.error.code);
    }
  } catch { console.error("report storage unavailable"); }
  const emailed = await sendEmail({
    to: process.env.CONTACT_TO_EMAIL ?? "info@dormscape.us",
    ...(email ? { replyTo: email } : {}),
    subject: `Dormscape report: ${category.label} [${id.slice(0, 8)}]`,
    text: `Report: ${id}\nCategory: ${category.label}\nPage: ${page ?? "Not supplied"}\nReply email: ${email || "Not supplied"}\n\n${description}`,
  });
  if (!stored && !emailed) return reply({ error: "Your report has not been sent. Please retry or email info@dormscape.us." }, 503);
  return reply({ ok: true, reference: id.slice(0, 8) }, 201);
}
