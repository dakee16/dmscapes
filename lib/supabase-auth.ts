// SERVER-ONLY. Verifies a request's Supabase access token so API routes can
// attribute writes/reads to a user. The browser client stores its session in
// localStorage (not cookies), so authenticated calls send the token in an
// Authorization: Bearer header; here we validate it with the service client.
import { getServiceClient } from "./supabase-server";

/**
 * Resolve the auth user id from the request's Bearer token, or null when the
 * header is missing/invalid or Supabase isn't configured. Never throws.
 */
export async function getUserId(request: Request): Promise<string | null> {
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const supabase = getServiceClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
