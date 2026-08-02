// SERVER-ONLY. This module reads SUPABASE_SERVICE_ROLE_KEY, which bypasses
// RLS and must never reach the client bundle. Import it exclusively from
// route handlers (app/api/**), never from client components, and never
// expose these values via NEXT_PUBLIC_ env vars.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client, or null when the environment isn't
 * configured yet (routes respond 503 / degrade gracefully in that case).
 */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
