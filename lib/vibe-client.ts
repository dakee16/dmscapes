"use client";

// Client wrapper for the "Create your own vibe" pipeline (POST /api/vibe/generate).
// Shared by the Step 2 panel (first generation) and the result page (the one
// free regeneration + paid re-rolls), so the fetch/normalize logic lives once.
import type { BedSize, Product } from "./types";

export interface GenerateVibeResult {
  ok: boolean;
  products?: Product[];
  /** True when products are placeholder matches (PA-API not live yet). */
  mock?: boolean;
  /** Present on failure, already warm and user-facing. */
  error?: string;
}

export async function generateVibe(args: {
  vibe: string;
  budget: number;
  bedSize?: BedSize;
  /** Rotates the match set so a regeneration returns something different. */
  seed?: number;
}): Promise<GenerateVibeResult> {
  try {
    const res = await fetch("/api/vibe/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = (await res.json().catch(() => ({}))) as {
      products?: Product[];
      mock?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? "Something went wrong building your room. Try again.",
      };
    }
    return { ok: true, products: data.products ?? [], mock: data.mock ?? false };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the matcher. Check your connection and try again.",
    };
  }
}
