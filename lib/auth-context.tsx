"use client";

// Client-side auth state shared by every page. Mounted once in app/layout.tsx.
// Degrades gracefully: without NEXT_PUBLIC_SUPABASE_* env, `configured` is
// false and auth UI should explain that accounts aren't available yet.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { clearAuthParamsFromUrl } from "@/lib/auth-url";
import { track } from "@/lib/analytics";
import { isPaid } from "@/lib/plan";
import AuthModal from "@/components/auth/AuthModal";
import PlusWelcome from "@/components/site/PlusWelcome";
import SignupWelcome from "@/components/site/SignupWelcome";

/** Row shape of public.profiles (supabase/migrations/0002_profiles.sql, plus
 *  the contact fields added in 0007). full_name/phone are optional so the app
 *  still runs before that migration is applied (the select uses "*"). */
export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  auth_provider: string | null;
  created_at: string;
  full_name?: string | null;
  phone?: string | null;
  /** "free", "flex", "plus", or "pro". Defaults to "free" when absent (migrations
   *  0008 add the column, 0010 widens it to three tiers, 0015 adds "flex"). */
  plan?: PlanTier | null;
  /** Plus only: remaining plan-generation credits (null for free and pro). */
  plan_credits_remaining?: number | null;
  /** Plus only: remaining save-design credits, independent of plan credits
   *  (null for free and pro). Added in migration 0012. */
  save_credits_remaining?: number | null;
  /** Free-tier lifetime meters: how many plans / saves this free account has
   *  ever used (capped at 1 each). Irrelevant once on a paid tier. */
  free_plans_used?: number | null;
  free_saves_used?: number | null;
  /** True once a user has ever purchased Plus; keeps premium features unlocked
   *  even after either counter runs out. Pro has features via its plan alone. */
  plus_features_unlocked?: boolean | null;
  /** When the account's current paid plan was purchased (set by the Stripe
   *  webhook). Null for free accounts. Present via select("*"); used on the
   *  Billing page's tier card. */
  plan_purchased_at?: string | null;
  /** When the user accepted the Terms + Privacy Policy. Set by handle_new_user
   *  (migration 0013): the email-signup timestamp from the consent checkbox, or
   *  now() for OAuth (implicit agreement). Null on accounts created before 0013. */
  terms_accepted_at?: string | null;
}

export type PlanTier = "free" | "flex" | "plus" | "pro";

/** What prompted the modal; copy inside adapts ("save your design" vs generic). */
export type AuthModalReason = "profile" | "save-design" | "buy" | "generate";

interface AuthContextValue {
  /** false when Supabase client env isn't configured. */
  configured: boolean;
  user: User | null;
  profile: Profile | null;
  /** true until the initial session lookup resolves. */
  loading: boolean;
  modalOpen: boolean;
  modalReason: AuthModalReason;
  openAuthModal: (reason?: AuthModalReason) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  /** Re-reads the profiles row (call after claiming a username). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Dev-only escape hatch so local screenshots can exercise signed-in UI without
// live Supabase: sessionStorage["dormscape-dev-auth"] = {"email","username"}.
// The NODE_ENV guard makes this dead code in production builds.
const DEV_AUTH_KEY = "dormscape-dev-auth";

// Once-per-browser-session flag: the premium PlusWelcome shows at most once, on
// the first real sign-in of the session (see the login handler). Survives a
// log out / log back in within the session; a new tab/window resets it. The flag
// is written only when the welcome actually shows, so a login that never displays
// it (paid member, or a buy-gate login) doesn't burn the one chance.
const PLUS_WELCOME_KEY = "dormscape-plus-welcome-seen";

// True when THIS tab loaded with auth tokens in its URL: the landing leg of a
// Google OAuth redirect OR an email-confirmation / magic-link click. That marks
// this as the tab where the login actually happened, as opposed to a background
// tab that only received the session via Supabase's cross-tab broadcast. Password
// recovery is excluded (it lands on /reset-password and must not welcome).
function detectUrlAuthLanding(): boolean {
  if (typeof window === "undefined") return false;
  const s = `${window.location.hash} ${window.location.search}`;
  if (/type=recovery/.test(s)) return false;
  return (
    /access_token=|refresh_token=|[?&]code=/.test(s) ||
    /type=(signup|magiclink|invite|email_change)/.test(s)
  );
}
// Captured once at module load, before the Supabase client strips the URL hash.
const INITIAL_URL_AUTH_LANDING = detectUrlAuthLanding();

// Dev-only: opens the PlusWelcome for local QA/screenshots without a real login
// (set sessionStorage[DEV_PLUS_WELCOME_KEY] = "1"). Guarded by NODE_ENV so it is
// dead code in production builds.
const DEV_PLUS_WELCOME_KEY = "dormscape-dev-plus-welcome";

function devMockProfile(): Profile | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined")
    return null;
  try {
    const raw = window.sessionStorage.getItem(DEV_AUTH_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      id: "dev-mock",
      email: p.email ?? "dev@dormscape.us",
      username: p.username ?? null,
      auth_provider: p.auth_provider ?? "email",
      created_at: new Date().toISOString(),
      full_name: p.full_name ?? null,
      phone: p.phone ?? null,
      plan: p.plan ?? "free",
      plan_credits_remaining: p.plan_credits_remaining ?? null,
      save_credits_remaining: p.save_credits_remaining ?? null,
      free_plans_used: p.free_plans_used ?? 0,
      free_saves_used: p.free_saves_used ?? 0,
      plus_features_unlocked: p.plus_features_unlocked ?? false,
      terms_accepted_at: p.terms_accepted_at ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Ask the server to revoke this account's oldest sessions beyond the concurrent
 * limit (see app/api/session/enforce). Best-effort: a failure never blocks auth.
 */
async function enforceSessionLimit(accessToken: string): Promise<void> {
  try {
    await fetch("/api/session/enforce", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      keepalive: true,
    });
  } catch {
    // Non-fatal: enforcement is a deterrent, not a gate on signing in.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<AuthModalReason>("profile");
  // Shown when this device's session was revoked elsewhere (e.g. bumped by the
  // concurrent-session cap), so we can tell it apart from a deliberate log out.
  const [sessionBumped, setSessionBumped] = useState(false);
  const intentionalSignOutRef = useRef(false);
  const hadUserRef = useRef(false);
  // Mirrors modalReason so the async SIGNED_IN handler reads the latest value.
  const modalReasonRef = useRef<AuthModalReason>("profile");
  // The premium after-login upgrade takeover. Queued on a qualifying sign-in,
  // then revealed once the profile (plan) is known and the auth modal is gone.
  const [plusWelcomeOpen, setPlusWelcomeOpen] = useState(false);
  const [pendingPlusWelcome, setPendingPlusWelcome] = useState(false);
  // True when THIS tab loaded with auth tokens in its URL (OAuth return or email
  // confirmation / magic-link landing), the tab where the login truly happened.
  // Consumed once by the login handler below.
  const urlLandingRef = useRef(INITIAL_URL_AUTH_LANDING);

  // Bumped on every fetch and on sign-out so a slow retry loop from a previous
  // user can't resurrect a stale profile after logout or a newer fetch.
  const fetchGenRef = useRef(0);

  const fetchProfile = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const gen = ++fetchGenRef.current;
      // Normally a signed-in user has a profile row (handle_new_user creates it
      // on signup), so a null/errored read is usually a transient auth-token
      // race, not a missing profile. Retrying instead of settling on null is
      // load-bearing: a stuck-null profile traps login on "Setting up your
      // account…", silently disables plan metering (isPlanMetered(null) is false
      // → unlimited plans), and hides the credits indicator.
      //
      // But a row CAN be genuinely gone: if it was deleted from `profiles` while
      // the auth.users row survived (manual cleanup, deleting a profile does not
      // cascade to auth.users), nothing recreates it, and that missing-profile
      // state is exactly what let those accounts bypass the design limit. So when
      // a read cleanly returns no row, we recreate a fresh FREE-tier profile
      // (plan defaults 'free', free_plans_used 0) and re-read it, failing safe
      // to the free cap, never to unrestricted access. RLS ("insert own") allows
      // the user to (re)create their own row; the upsert is race-safe.
      // select("*") so full_name/phone (migration 0007) come through when
      // present but their absence never errors this app-wide fetch.
      let recreated = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();
        if (fetchGenRef.current !== gen) return; // superseded by logout/newer fetch
        if (!error && data) {
          setProfile(data as Profile);
          return;
        }
        // A clean "no row" (not an error): recreate once, then let the next
        // attempt read it back.
        if (!error && !data && !recreated) {
          recreated = true;
          const { data: authData } = await supabase.auth.getUser();
          await supabase.from("profiles").upsert(
            {
              id: uid,
              email: authData.user?.email ?? null,
              auth_provider:
                (authData.user?.app_metadata?.provider as string | undefined) ?? "email",
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
          if (fetchGenRef.current !== gen) return;
          continue; // re-read immediately, no backoff
        }
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        if (fetchGenRef.current !== gen) return;
      }
      // Exhausted retries: leave any previously loaded profile untouched rather
      // than clobbering it to null over a transient failure.
    },
    [supabase]
  );

  useEffect(() => {
    const dev = devMockProfile();
    if (dev) {
      setUser({ id: dev.id, email: dev.email ?? undefined } as User);
      setProfile(dev);
      setLoading(false);
      // Dev-only screenshot/QA hook for the welcome (see DEV_PLUS_WELCOME_KEY).
      if (
        process.env.NODE_ENV !== "production" &&
        !isPaid(dev) &&
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(DEV_PLUS_WELCOME_KEY)
      ) {
        setPlusWelcomeOpen(true);
      }
      return;
    }
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      // getSession resolves only after the client has initialized and consumed
      // any token from the URL (implicit-flow OAuth return / email link). Strip
      // it now, unconditionally: whether the session took or the token was stale,
      // nothing sensitive should linger in the address bar.
      clearAuthParamsFromUrl();
      // A session already present at load is a silent restore, not a fresh login,
      // so mark it seen to suppress the welcome. The lone exception is a URL-auth
      // landing (OAuth return or email-confirmation click): that session IS the
      // login, so leave hadUserRef alone and let the login handler welcome it.
      if (u && !urlLandingRef.current) hadUserRef.current = true;
      if (u) void fetchProfile(u.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // Any settled auth event with a session (SIGNED_IN, INITIAL_SESSION,
      // PASSWORD_RECOVERY, token refresh) means supabase has already consumed the
      // URL token; make sure none of it lingers in the address bar. No-op when
      // the URL is already clean.
      if (u) clearAuthParamsFromUrl();
      if (u) void fetchProfile(u.id);
      else {
        fetchGenRef.current++; // cancel any in-flight retry loop
        setProfile(null);
      }

      // Is the user actually looking at THIS tab right now? Supabase broadcasts a
      // new session to every open tab, so a background tab also fires SIGNED_IN;
      // it's hidden, while the tab the user acted in (a fresh login, an OAuth
      // return, or the email-verification tab they just clicked into) is visible.
      // This is what keeps the welcome on the tab the user is in.
      const activeTab =
        typeof document === "undefined" || document.visibilityState === "visible";
      // A genuine login in THIS tab: a SIGNED_IN while this tab is active or
      // landed the auth URL, or the INITIAL_SESSION that lands when returning
      // from an OAuth redirect / clicking an email-confirmation link. A silent
      // session restore or a cross-tab broadcast into a hidden tab is neither.
      const isLoginEvent =
        (event === "SIGNED_IN" &&
          Boolean(u) &&
          (urlLandingRef.current || activeTab)) ||
        (event === "INITIAL_SESSION" && Boolean(u) && urlLandingRef.current);

      if (isLoginEvent) {
        // A fresh sign-in: clear any stale bump notice and ask the server to
        // revoke this account's oldest sessions past the concurrent limit.
        setSessionBumped(false);
        if (session?.access_token) void enforceSessionLimit(session.access_token);
        // Consume the one-shot URL-landing flag so later re-fires this page load
        // don't re-trigger. A URL landing is always a real login, so it bypasses
        // the hadUserRef guard (which stops focus/refresh SIGNED_IN re-fires).
        const landed = urlLandingRef.current;
        urlLandingRef.current = false;
        if (!hadUserRef.current || landed) {
          const reason = modalReasonRef.current;
          // Stay on whatever page they authenticated from: a general login no
          // longer bounces to the home page. In-place flows (save, buy) resume
          // on their own page; the design gate (reason "generate") shows its
          // credit-confirm prompt on the style page. None of them navigate here.
          // Queue the premium welcome, once per browser session. Skip it when the
          // login was to finish a buy, so it never collides with that resume
          // (buy-gate opens with reason "buy"). The flag is set when it actually
          // shows (reveal effect below), not here, so an undisplayed login keeps
          // the one-per-session chance intact.
          if (
            reason !== "buy" &&
            reason !== "generate" &&
            typeof window !== "undefined" &&
            !window.sessionStorage.getItem(PLUS_WELCOME_KEY)
          ) {
            setPendingPlusWelcome(true);
          }
        }
      } else if (event === "SIGNED_OUT") {
        // Distinguish an involuntary sign-out (session revoked on another
        // device by the concurrent-session cap, or a failed token refresh)
        // from the user clicking Log out. Only the involuntary case surfaces
        // the polite notice.
        if (hadUserRef.current && !intentionalSignOutRef.current) {
          setSessionBumped(true);
        }
        intentionalSignOutRef.current = false;
      }

      hadUserRef.current = Boolean(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // Reliably strip any Supabase auth token the address bar picked up from an
  // implicit-flow landing (OAuth return, email-confirmation, or recovery link).
  // Runs once on mount, independent of how auth is configured, so a token never
  // lingers even if the client's init stalls. supabase parses the URL params
  // synchronously when the client is created and keeps the token in memory for
  // its pending exchange, so clearing the URL after a short grace period is safe
  // and can't break sign-in. The event handlers above also clear it the instant
  // a session settles, which is faster on the happy path.
  useEffect(() => {
    const t = setTimeout(clearAuthParamsFromUrl, 600);
    return () => clearTimeout(t);
  }, []);

  const openAuthModal = useCallback((reason: AuthModalReason = "profile") => {
    modalReasonRef.current = reason;
    setModalReason(reason);
    setModalOpen(true);
    track("auth_modal_opened", { reason });
  }, []);

  // Reveal the queued PlusWelcome once the plan is known (profile loaded) and
  // the auth modal has closed (so it never stacks on the login / username
  // step). Plus members never see it; either way the queue clears.
  useEffect(() => {
    if (!pendingPlusWelcome || !profile || modalOpen) return;
    setPendingPlusWelcome(false);
    // Already shown once this session (e.g. a prior tab-focus re-queue): stop.
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(PLUS_WELCOME_KEY)
    ) {
      return;
    }
    // Plus members never see it; either way the queue clears. Record it as seen
    // only here, the moment it truly shows, so it stays a real once-per-session
    // moment rather than being spent by a login that never displayed it.
    // A brand-new free account (no plan used yet) gets the SignupWelcome "start
    // here" moment instead, so the Plus upsell never stacks on it; it can still
    // surface on a later session once they've actually tried the product.
    if (!isPaid(profile) && (profile.free_plans_used ?? 0) > 0) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PLUS_WELCOME_KEY, "1");
      }
      setPlusWelcomeOpen(true);
    }
  }, [pendingPlusWelcome, profile, modalOpen]);

  const closeAuthModal = useCallback(() => setModalOpen(false), []);

  const signOut = useCallback(async () => {
    // Mark this as a deliberate log out so the SIGNED_OUT handler doesn't mistake
    // it for a session that got bumped elsewhere.
    intentionalSignOutRef.current = true;
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      window.sessionStorage.removeItem(DEV_AUTH_KEY);
    }
    await supabase?.auth.signOut();
    fetchGenRef.current++; // cancel any in-flight retry loop
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: supabase !== null,
      user,
      profile,
      loading,
      modalOpen,
      modalReason,
      openAuthModal,
      closeAuthModal,
      signOut,
      refreshProfile,
    }),
    [
      supabase,
      user,
      profile,
      loading,
      modalOpen,
      modalReason,
      openAuthModal,
      closeAuthModal,
      signOut,
      refreshProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal />
      <PlusWelcome
        open={plusWelcomeOpen}
        onClose={() => setPlusWelcomeOpen(false)}
      />
      <SignupWelcome />
      {sessionBumped && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="w-full max-w-md rounded-xl border border-ink/10 bg-white p-4 shadow-[0_20px_50px_-20px_rgba(23,23,43,0.45)]">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-highlight/60 text-ink"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  You&rsquo;ve been logged out
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  Your account was signed in on another device. We keep up to two
                  devices signed in at once, so the oldest was signed out. You can
                  log back in anytime.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSessionBumped(false);
                      openAuthModal("profile");
                    }}
                    className="cursor-pointer rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
                  >
                    Log back in
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionBumped(false)}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSessionBumped(false)}
                aria-label="Dismiss"
                className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
