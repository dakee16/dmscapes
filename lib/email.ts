// SERVER-ONLY. Minimal transactional-email helper built directly on Resend's
// REST API (https://resend.com), no SDK dependency, just fetch. The call runs
// server-side (inside an API route), so it isn't subject to the browser CSP.
//
// It no-ops safely when RESEND_API_KEY is unset, so local/dev and unconfigured
// environments never crash; callers treat delivery as best-effort and always
// keep their own durable DB record.
//
// SETUP REQUIRED BY THE SITE OWNER (one-time):
//   1. Create a Resend account and verify the dormscape.us domain (add the DNS
//      records Resend gives you). Until the domain is verified, `from` must use
//      Resend's onboarding@resend.dev sandbox address.
//   2. Set RESEND_API_KEY in the environment (Vercel + .env.local).
//   3. Optional overrides: CONTACT_FROM_EMAIL (default
//      "Dormscape <contact@dormscape.us>") and CONTACT_TO_EMAIL
//      (default "info@dormscape.us").

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  /** Set so replies go to the person who wrote in, not the sending domain. */
  replyTo?: string;
  from?: string;
}

/** Whether a transactional-email provider is configured in this environment. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send one email through Resend. Returns true when the provider accepts the
 * message, false otherwise (unconfigured, network error, or non-2xx). Never
 * throws, email is always best-effort here.
 */
export async function sendEmail({ to, subject, text, replyTo, from }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const sender = from ?? process.env.CONTACT_FROM_EMAIL ?? "Dormscape <contact@dormscape.us>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send error:", err instanceof Error ? err.message : err);
    return false;
  }
}
