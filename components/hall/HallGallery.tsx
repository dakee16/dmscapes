import Link from "next/link";
import Headline from "@/components/ds/Headline";
import RoomThumb from "@/components/room/RoomThumb";
import Avatar from "@/components/site/Avatar";
import GalleryGrid from "@/components/growth/GalleryGrid";
import { formatRoomType } from "@/lib/format";
import { formatDims } from "@/lib/schools";
import { styleById } from "@/lib/styles";
import { CREATOR_MIN_FOLLOWERS } from "@/lib/plan";
import { galleryBudget, sharedMonth, type GalleryRoom } from "@/lib/gallery";
import g from "@/components/growth/Growth.module.css";

const vibe = (r: GalleryRoom) => (r.style === "custom" ? "Custom vibe" : styleById(r.style).name);

/** One shared layout: the plan, its size and vibe, and (creators only) who made it.
 *  `place` links the card to its hall page (on /gallery). */
export function GalleryCard({ room: r, place }: { room: GalleryRoom; place?: { label: string; href: string } }) {
  return (
    <div className={g.card}>
      <div className={g.plan}>
        <RoomThumb lengthFt={r.lengthFt} widthFt={r.widthFt} furniture={r.furniture} outline={r.outline} />
      </div>
      {place && (
        <Link href={place.href} className={g.cardPlace}>
          {place.label}
        </Link>
      )}
      <p className={g.cardTitle}>{[formatRoomType(r.roomType), formatDims(r.lengthFt, r.widthFt)].filter(Boolean).join(" · ")}</p>
      <p className={g.cardNote}>
        {vibe(r)} · about ${galleryBudget(r.budget)} budget · shared {sharedMonth(r.sharedAt)}
      </p>
      {r.byline && (
        <p className={g.byline}>
          <Avatar className={g.bylineAvatar} src={r.byline.avatar} name={r.byline.username} />
          <span>@{r.byline.username}</span>
          <span className={g.creatorTag} tabIndex={0} data-tip={`Verified creator: ${CREATOR_MIN_FOLLOWERS.toLocaleString("en-US")}+ followers`}>
            Creator
          </span>
        </p>
      )}
    </div>
  );
}

/** Layouts students planned for this hall and chose to share. Renders nothing until there is one. */
export default function HallGallery({ hall, rooms, cta }: { hall: string; rooms: GalleryRoom[]; cta: React.ReactNode }) {
  if (!rooms.length) return null;
  return (
    <section className="ds-section" aria-labelledby="gallery-title">
      <div className="ds-wrap">
        <Headline id="gallery-title" className="ds-h2" lines={[{ text: "How students set up" }, { text: `${hall} rooms.`, serif: true }]} />
        <p className={g.galleryLede} data-reveal="">
          Real layouts students planned for this hall and chose to share. Their names and shopping lists stay private,
          except for creators.
        </p>
        <GalleryGrid label={`Layouts shared for ${hall}`}>
          {rooms.map((r, i) => (
            <GalleryCard key={i} room={r} />
          ))}
        </GalleryGrid>
        <div className={g.galleryCta}>
          {cta}{" "}
          <Link href="/gallery" className="ds-btn ds-btn--ghost-ink">
            See every hall&rsquo;s layouts
          </Link>
        </div>
      </div>
    </section>
  );
}
