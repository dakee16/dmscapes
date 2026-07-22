"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RoomThumb from "@/components/room/RoomThumb";
import ShareButton from "@/components/room/ShareButton";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { getSchool } from "@/lib/schools";
import { styleById } from "@/lib/styles";
import { formatRoomType } from "@/lib/format";
import type { AccountRoomSummary, AccountRoomsResponse } from "@/lib/api-types";

/** Resolve a saved design's stored ids into human-readable names. */
function tileMeta(room: AccountRoomSummary) {
  const school = room.college_id ? getSchool(room.college_id) : undefined;
  const dorm = school?.dorms.find((d) => d.id === room.dorm_id);
  const style = styleById(room.style);
  const place = [school?.name, dorm?.name].filter(Boolean).join(" · ");
  return { place, style };
}

function DesignTile({ room }: { room: AccountRoomSummary }) {
  const { place, style } = tileMeta(room);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${room.id}`
      : `/room/${room.id}`;

  return (
    <div className="relative flex items-center gap-4 rounded-xl border border-ink/10 bg-card p-4 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(23,23,43,0.35)] sm:p-5">
      {/* Stretched link: whole tile opens the read-only room view. The share
          button sits above it (relative + z) so it stays independently clickable. */}
      <Link
        href={`/room/${room.id}`}
        aria-label={`Open ${room.name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt"
      />
      <div
        className="pointer-events-none w-20 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-white p-1 sm:w-24"
        aria-hidden="true"
      >
        {room.length_ft && room.width_ft && room.furniture?.length ? (
          <RoomThumb
            lengthFt={room.length_ft}
            widthFt={room.width_ft}
            furniture={room.furniture}
            className="h-auto w-full"
          />
        ) : (
          <div className="h-12 rounded bg-paper" />
        )}
      </div>
      <div className="pointer-events-none min-w-0 flex-1">
        <h3 className="truncate font-display text-base font-bold tracking-tight">
          {room.name}
        </h3>
        {place && <p className="mt-0.5 truncate text-sm text-ink-soft">{place}</p>}
        <p className="mt-1 truncate font-mono text-xs text-ink-soft">
          {style.name} · {formatRoomType(room.room_type)} · ${room.budget}
        </p>
      </div>
      <div className="relative z-10 shrink-0">
        <ShareButton url={url} title={room.name} from="account" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center">
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-highlight/40 text-3xl"
        aria-hidden="true"
      >
        🛏️
      </div>
      <h3 className="mt-4 font-display text-xl font-bold tracking-tight">
        No saved designs yet
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
        Plan a room you love, give it a name, and it&apos;ll live here so you can pick
        up on any device. Want to save one?
      </p>
      <Link
        href="/plan"
        className="mt-5 inline-flex h-11 items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
      >
        Plan my room
      </Link>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading your designs">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-xl bg-ink/8" />
      ))}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal, signOut } = useAuth();

  // null = still loading; array = loaded (possibly empty).
  const [designs, setDesigns] = useState<AccountRoomSummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const guardedRef = useRef(false);
  const viewedRef = useRef(false);

  // Access control: logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  useEffect(() => {
    if (user && !viewedRef.current) {
      viewedRef.current = true;
      track("account_viewed");
    }
  }, [user]);

  // Load the user's named designs (service-role API, so send the access token).
  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const token = supabase
          ? (await supabase.auth.getSession()).data.session?.access_token
          : null;
        const res = await fetch("/api/account/rooms", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AccountRoomsResponse;
        if (alive) setDesigns(data.rooms);
      } catch {
        if (alive) {
          setDesigns([]);
          setLoadFailed(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [loading, user]);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    router.replace("/");
  }

  const ready = !loading && Boolean(user);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        {!ready ? (
          <div aria-busy="true" aria-label="Loading your account">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-ink/8" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-ink/5" />
            <div className="mt-10 h-6 w-32 animate-pulse rounded bg-ink/8" />
            <div className="mt-4">
              <ListSkeleton />
            </div>
          </div>
        ) : (
          <>
            {/* Identity */}
            <header>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
                Your account
              </p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {profile?.username ? `@${profile.username}` : "Welcome back"}
              </h1>
              {user?.email && (
                <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
              )}
              {!profile?.username && (
                <button
                  type="button"
                  onClick={() => openAuthModal("profile")}
                  className="mt-3 cursor-pointer rounded-lg border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
                >
                  Set a username
                </button>
              )}
            </header>

            {/* Saved designs */}
            <div className="mt-10 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-bold tracking-tight">
                Saved designs
              </h2>
              {designs && designs.length > 0 && (
                <span className="font-mono text-xs text-ink-soft">
                  {designs.length} saved
                </span>
              )}
            </div>

            <div className="mt-4">
              {designs === null ? (
                <ListSkeleton />
              ) : designs.length === 0 ? (
                <>
                  <EmptyState />
                  {loadFailed && (
                    <p className="mt-3 text-center text-xs text-ink-soft" role="status">
                      Couldn&apos;t reach your saved designs just now. Refresh to try
                      again.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  {designs.map((room) => (
                    <DesignTile key={room.id} room={room} />
                  ))}
                </div>
              )}
            </div>

            {/* Logout — deliberately red/destructive, set apart from everything else */}
            <div className="mt-12 flex justify-end border-t border-ink/8 pt-6">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="cursor-pointer rounded-lg border border-[#c2321e]/40 bg-white px-4 py-2 text-sm font-semibold text-[#c2321e] transition-colors hover:bg-[#c2321e] hover:text-white disabled:cursor-wait disabled:opacity-60"
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
