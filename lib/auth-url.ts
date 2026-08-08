// Reliable, app-owned cleanup of Supabase auth params from the visible URL.
//
// The browser client uses the implicit flow (see lib/supabase-browser.ts for
// why), which returns the whole session in the URL fragment, e.g.
//   https://dormscape.us/#access_token=eyJ...&refresh_token=...&type=signup
// supabase-js consumes that token and *tries* to clear it (window.location.hash
// = ""), but that runs only inside _getSessionFromURL, is skipped on any error
// getting the user, and even on success leaves a bare trailing "#". So we do our
// own cleanup, called once the session is actually established (never before, or
// we'd rob supabase of the token it still needs to read).

// If the hash carries any of these, the whole fragment is Supabase auth junk and
// is dropped wholesale. access_token/refresh_token are the load-bearing signals.
const HASH_TOKEN_RE =
  /(?:^|[#&])(?:access_token|refresh_token|provider_token|provider_refresh_token|expires_in|expires_at|token_type)=/;
// PKCE codes and OAuth errors can land in the query string instead.
const QUERY_AUTH_KEYS = ["code", "error", "error_code", "error_description"];

/**
 * Given a full URL, return a cleaned relative URL (path + query + hash) with all
 * auth params stripped, or null when there was nothing to strip. Pure and
 * window-free so it's unit-testable; clearAuthParamsFromUrl wraps it.
 */
export function cleanAuthUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const hashHasTokens = url.hash.length > 1 && HASH_TOKEN_RE.test(url.hash);
  let queryChanged = false;
  for (const key of QUERY_AUTH_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      queryChanged = true;
    }
  }
  if (!hashHasTokens && !queryChanged) return null;
  if (hashHasTokens) url.hash = "";
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Strip Supabase auth tokens/params from the address bar via history.replaceState
 * (no navigation, no history entry). Safe to call any time; a no-op when the URL
 * is already clean. Call it only after the session has settled.
 */
export function clearAuthParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const cleaned = cleanAuthUrl(window.location.href);
  if (cleaned !== null) {
    window.history.replaceState(window.history.state, "", cleaned);
  }
}
