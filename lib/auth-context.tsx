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
import { track } from "@/lib/analytics";
import { isPaid } from "@/lib/plan";
import AuthModal from "@/components/auth/AuthModal";
import PlusWelcome from "@/components/site/PlusWelcome";

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
  /** "free", "plus", or "pro". Defaults to "free" when absent (migrations 0008
   *  add the column, 0010 widens it to three tiers). */
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
}

export type PlanTier = "free" | "plus" | "pro";

/** What prompted the modal; copy inside adapts ("save your design" vs generic). */
export type AuthModalReason = "profile" | "save-design" | "buy";

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
// the first real sign-in of the session (see the SIGNED_IN handler). Survives a
// log out / log back in within the session; a new tab/window resets it.
const PLUS_WELCOME_KEY = "dormscape-plus-welcome-seen";

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
  const router = useRouter();
  // Kept in a ref so the long-lived onAuthStateChange subscription always reaches
  // the current router without needing to re-subscribe.
  const routerRef = useRef(router);
  routerRef.current = router;
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

  const fetchProfile = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      // select("*") so full_name/phone (migration 0007) come through when
      // present but their absence never errors this app-wide fetch.
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      setProfile((data as Profile | null) ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    const dev = devMockProfile();
    if (dev) {
      setUser({ id: dev.id, email: dev.email ?? undefined } as User);
      setProfile(dev);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      hadUserRef.current = Boolean(u);
      if (u) void fetchProfile(u.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) void fetchProfile(u.id);
      else setProfile(null);

      if (event === "SIGNED_IN") {
        // A fresh sign-in: clear any stale bump notice and ask the server to
        // revoke this account's oldest sessions past the concurrent limit.
        setSessionBumped(false);
        if (session?.access_token) void enforceSessionLimit(session.access_token);
        // First real sign-in of this browser session (a session restore or a
        // focus-driven re-fire keeps hadUserRef true, so those don't count).
        if (!hadUserRef.current) {
          const reason = modalReasonRef.current;
          // Land a fresh login or signup on the home page, unless the sign-in was
          // to finish an in-place action (saving the current design, or buying a
          // plan) that navigating away would interrupt.
          if (reason !== "save-design" && reason !== "buy") {
            routerRef.current.push("/");
          }
          // Queue the premium welcome, once per browser session. Skip showing it
          // when the login was to complete a buy, so it never collides with that
          // resume (buy-gate opens with reason "buy").
          if (
            typeof window !== "undefined" &&
            !window.sessionStorage.getItem(PLUS_WELCOME_KEY)
          ) {
            window.sessionStorage.setItem(PLUS_WELCOME_KEY, "1");
            if (reason !== "buy") setPendingPlusWelcome(true);
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
    if (!isPaid(profile)) setPlusWelcomeOpen(true);
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
