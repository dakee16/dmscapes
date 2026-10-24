import { getBrowserClient } from "@/lib/supabase-browser";

/** Headers for the Hall Finder API: the Supabase session token, and in dev the auth stub's plan. */
export async function hallFinderHeaders(profile: { id?: string; plan?: string | null } | null): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  // Dev-only: the sessionStorage auth stub has no real token, so tell the dev server the plan.
  if (process.env.NODE_ENV !== "production" && profile?.id === "dev-mock") h["x-dormscape-dev-plan"] = String(profile.plan ?? "free");
  const token = (await getBrowserClient()?.auth.getSession())?.data.session?.access_token;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export interface SavedSetup {
  id: string;
  collegeId: string;
  name: string;
  places: { placeId?: string; pin?: [number, number]; days: number; label?: string }[];
  filters: Record<string, boolean>;
  shareToken: string | null;
  updatedAt: string;
}
