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
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import AuthModal from "@/components/auth/AuthModal";

/** Row shape of public.profiles (supabase/migrations/0002_profiles.sql). */
export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  auth_provider: string | null;
  created_at: string;
}

/** What prompted the modal; copy inside adapts ("save your design" vs generic). */
export type AuthModalReason = "profile" | "save-design";

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

function devMockProfile(): Profile | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined")
    return null;
  try {
    const raw = window.sessionStorage.getItem(DEV_AUTH_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      id: "dev-mock",
      email: p.email ?? "dev@dormscape.com",
      username: p.username ?? null,
      auth_provider: p.auth_provider ?? "email",
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<AuthModalReason>("profile");

  const fetchProfile = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, email, username, auth_provider, created_at")
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
      if (u) void fetchProfile(u.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) void fetchProfile(u.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const openAuthModal = useCallback((reason: AuthModalReason = "profile") => {
    setModalReason(reason);
    setModalOpen(true);
    track("auth_modal_opened", { reason });
  }, []);

  const closeAuthModal = useCallback(() => setModalOpen(false), []);

  const signOut = useCallback(async () => {
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
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
