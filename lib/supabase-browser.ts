// CLIENT-SIDE Supabase: uses the anon (publishable) key only, which is safe
// to ship in the bundle because RLS governs every table it can touch.
// The service-role key lives exclusively in lib/supabase-server.ts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Singleton browser client, or null when NEXT_PUBLIC_SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_ANON_KEY aren't set (auth UI degrades gracefully).
 */
export function getBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client =
    url && key
      ? createClient(url, key, {
          auth: {
            // Implicit flow, NOT pkce. This is deliberate for a client-only SPA.
            //
            // PKCE stores a one-time code verifier in the browsing context that
            // started the sign-up, and the email link comes back as `?code=...`
            // that must be exchanged with that verifier. Email clients open the
            // link in a NEW context (new tab, in-app webview, or another
            // device), which has no verifier, so the exchange fails and that
            // tab never logs in, only the original tab does. Implicit flow
            // returns the session in the URL fragment instead, so detecting the
            // session (below) needs nothing from the original context and the
            // redirected tab logs in on its own. Same fix covers the password
            // recovery link. If auth ever moves server-side (cookie sessions
            // via @supabase/ssr), switch back to pkce and exchange on the
            // server, where the verifier is a cookie shared across tabs.
            flowType: "implicit",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      : null;
  return client;
}
