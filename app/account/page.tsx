"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import PurchaseThankYou from "@/components/site/PurchaseThankYou";
import RoomThumb from "@/components/room/RoomThumb";
import ShareButton from "@/components/room/ShareButton";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { hasFeatures } from "@/lib/plan";
import { AccountHeader, MembershipCard, IdentityCard, accountStyles as s } from "@/components/account/AccountUI";
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
    <article className={s.designTile}>
      <Link href={`/room/${room.id}`} aria-label={`Open ${room.name}`} className={s.tileLink} />
      <div className={s.thumbnail} aria-hidden="true">
        {room.length_ft && room.width_ft && room.furniture?.length ? (
          <RoomThumb lengthFt={room.length_ft} widthFt={room.width_ft} furniture={room.furniture}
            outline={room.outline ?? null} className="h-auto w-full" />
        ) : <span className={s.thumbnailFallback}>Your room, saved</span>}
      </div>
      <div className={s.tileBody}>
        <div className={s.tileMeta}><span>{style.name}</span><span>{formatRoomType(room.room_type)}</span></div>
        <h3>{room.name}</h3>
        {place && <p>{place}</p>}
        <p>Budget: ${room.budget}</p>
      </div>
      <div className={s.tileShare}><ShareButton url={url} title={room.name} from="account" /></div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className={s.empty}>
      <span className={s.emptyMark} aria-hidden="true">Make room.</span>
      <h3>Your first design belongs here.</h3>
      <p>Start with your room, find your vibe, and save a layout you love. Your saved designs stay together across devices.</p>
      <Link href="/plan" className={s.primary}>Plan my room <span aria-hidden="true">↗</span></Link>
    </div>
  );
}

function ListSkeleton() {
  return <div className={s.designGrid} aria-busy="true" aria-label="Loading your designs">
    {[0, 1, 2].map(i => <div key={i} className={s.skeleton} />)}
  </div>;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal, signOut } = useAuth();
  const { openUpgrade } = useUpgrade();
  const canCompare = hasFeatures(profile);

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
      <SiteHeader />
      <PurchaseThankYou />
      <main id="page-content" tabIndex={-1} className={`dm-page ${s.page}`}>
        <AccountHeader active="overview" title="Your personal" accent="studio."
          description="All your room ideas, with room for the next one."
          action={<Link href="/plan" className={s.primary}>New room plan <span aria-hidden="true">↗</span></Link>} />
        {!ready ? <ListSkeleton /> : (
          <>
            <div className={s.overview}>
              <section className={s.welcome} aria-label="Account overview">
                <IdentityCard name={profile?.full_name} username={profile?.username} email={user?.email} />
                <p className={s.welcomeText}>A space for everything you&apos;re imagining. Revisit your layouts, share your favorites, or start something new.</p>
                {!profile?.username && <button type="button" onClick={() => openAuthModal("profile")} className={s.secondary}>Set a username</button>}
                <dl className={s.stats}>
                  <div><dt>Saved designs</dt><dd>{designs === null || loadFailed ? "…" : designs.length}</dd></div>
                  <div><dt>Your profile</dt><dd><Link href="/account/settings" className="text-base text-cobalt">Edit details ↗</Link></dd></div>
                </dl>
              </section>
              <MembershipCard profile={profile} />
            </div>
            <div className={s.sectionHeading}>
              <div><h2>On your drawing board</h2><p>Your saved rooms, ready for another look.</p></div>
              {designs && designs.length >= 2 && (canCompare
                ? <Link href="/account/compare" className={s.secondary}>Compare designs ↗</Link>
                : <button type="button" onClick={() => openUpgrade("compare")} className={s.secondary}>Compare designs <span className="bg-highlight px-2 py-1 text-xs">Plus</span></button>)}
            </div>
            {designs === null ? <ListSkeleton /> : loadFailed ? (
              <div className={s.error} role="status"><h3>Your designs couldn&apos;t load.</h3>
                <p>Your saved rooms haven&apos;t changed. Reload the page to try again.</p>
                <button type="button" className={s.secondary} onClick={() => window.location.reload()}>Try again</button>
              </div>
            ) : designs.length === 0 ? <EmptyState /> : (
              <div className={s.designGrid}>{designs.map(room => <DesignTile key={room.id} room={room} />)}</div>
            )}
            <div className={s.footer}>
              <p>Your ideas live here. Make yourself at home.</p>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className={s.secondary}>
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
