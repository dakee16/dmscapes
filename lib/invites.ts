"use client";

// Browser side of invites and creator codes: remember the link a visitor arrived
// through (until they sign up, at most 30 days), then hand it to the server once
// they sign in. The server decides whether it counts (lib/referrals.ts).
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";

const REF_KEY = "dormscape-ref";
const CODE_KEY = "dormscape-creator-code";
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

type Stored = { code?: string; room?: string; at: number };

function read(key: string): Stored | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) ?? "null") as Stored | null;
    return v && Date.now() - v.at < KEEP_MS ? v : null;
  } catch {
    return null;
  }
}
function write(key: string, v: Stored) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ }
}
function drop(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* storage blocked */ }
}

/** Remember an invite (?ref=CODE, or a shared /room/ID page) and a creator code
 * (?creator=JANE, from /c/JANE; not ?code=, which Supabase sign-in returns can use).
 * The first invite wins; a newer creator code replaces an older one. */
export function captureArrival(): void {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref")?.toLowerCase();
  const room = window.location.pathname.match(/^\/room\/([A-Za-z0-9_-]{6,20})\/?$/)?.[1];
  if (!read(REF_KEY)) {
    if (ref && /^[a-z0-9]{6,16}$/.test(ref)) write(REF_KEY, { code: ref, at: Date.now() });
    else if (room) write(REF_KEY, { room, at: Date.now() });
  }
  const code = params.get("creator")?.trim().toLowerCase();
  if (code && /^[a-z0-9_-]{2,32}$/.test(code)) write(CODE_KEY, { code, at: Date.now() });
}

export const hasInvite = (): boolean => Boolean(read(REF_KEY));
export const storedCreatorCode = (): string | null => read(CODE_KEY)?.code ?? null;
export const forgetCreatorCode = (): void => drop(CODE_KEY);

export async function bearer(): Promise<string | null> {
  const supabase = getBrowserClient();
  return supabase ? ((await supabase.auth.getSession()).data.session?.access_token ?? null) : null;
}

/** After a sign-in: tell the server who invited this account. It ignores anything that
 * doesn't qualify (an older account, a self-invite), so the invite is forgotten either way. */
export async function claimInvite(token: string): Promise<void> {
  const src = read(REF_KEY);
  if (!src) return;
  try {
    const res = await fetch("/api/referrals/claim", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code: src.code, room: src.room }),
    });
    if (res.status === 429 || res.status >= 500) return; // keep it for the next sign-in
    drop(REF_KEY);
    const data = (await res.json().catch(() => null)) as { claimed?: boolean } | null;
    if (data?.claimed) track("referral_claimed", { via: src.code ? "link" : "room" });
  } catch {
    // Offline: keep it for the next sign-in.
  }
}
