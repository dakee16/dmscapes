import Headline from "@/components/ds/Headline";
import RoomThumb from "@/components/room/RoomThumb";
import { formatRoomType } from "@/lib/format";
import { formatDims } from "@/lib/schools";
import { styleById } from "@/lib/styles";
import type { GalleryRoom } from "@/lib/gallery";
import g from "@/components/growth/Growth.module.css";

const shared = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const vibe = (r: GalleryRoom) => (r.style === "custom" ? "Custom vibe" : styleById(r.style).name);

/** Layouts students planned for this hall and chose to share. Renders nothing until there is one. */
export default function HallGallery({ hall, rooms, cta }: { hall: string; rooms: GalleryRoom[]; cta: React.ReactNode }) {
  if (!rooms.length) return null;
  return (
    <section className="ds-section" aria-labelledby="gallery-title">
      <div className="ds-wrap">
        <Headline id="gallery-title" className="ds-h2" lines={[{ text: "How students set up" }, { text: `${hall} rooms.`, serif: true }]} />
        <p className={g.galleryLede} data-reveal="">
          Real layouts students planned for this hall and chose to share. Their names and shopping lists stay private.
        </p>
        <ul className={g.gallery}>
          {rooms.map((r, i) => (
            <li key={i} className={g.card}>
              <div className={g.plan}>
                <RoomThumb lengthFt={r.lengthFt} widthFt={r.widthFt} furniture={r.furniture} outline={r.outline} />
              </div>
              <p className={g.cardTitle}>{[formatRoomType(r.roomType), formatDims(r.lengthFt, r.widthFt)].filter(Boolean).join(" · ")}</p>
              <p className={g.cardNote}>
                {vibe(r)} · about ${Math.max(50, Math.round(r.budget / 50) * 50)} budget · shared {shared(r.sharedAt)}
              </p>
            </li>
          ))}
        </ul>
        <div className={g.galleryCta}>{cta}</div>
      </div>
    </section>
  );
}
