import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import RollingNumber from "@/components/ds/RollingNumber";
import JsonLd from "@/components/site/JsonLd";
import ThrowDeck, { type DeckRoom } from "@/components/gallery/ThrowDeck";
import EmptyBoard from "@/components/gallery/EmptyBoard";
import GalleryBoard, { type BoardRoom } from "@/components/gallery/GalleryBoard";
import GalleryFaq from "@/components/gallery/GalleryFaq";
import { ArrowRight } from "@/components/ds/Icons";
import { galleryBudget, recentGallery, sharedMonth, type GalleryRoom } from "@/lib/gallery";
import { SCHOOLS, getDorm } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { formatRoomType } from "@/lib/format";
import { formatDims } from "@/lib/schools";
import { FEATURED_ROOMS, HOME_VIBES, feetInches, spokenFeet } from "@/lib/home-data";
import { STYLES, styleById } from "@/lib/styles";
import { CREATOR_MIN_FOLLOWERS } from "@/lib/plan";
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd, pageMetadata, SITE_URL } from "@/lib/seo";
import css from "@/components/gallery/Gallery.module.css";

// Every hall's shared layouts, newest first (lib/gallery.ts). Re-rendered at most
// every 10 minutes; hall pages show their own six.
export const revalidate = 600;
const latest = cache(() => recentGallery(24));

const PATH = "/gallery";
const DESCRIPTION =
  "Real dorm room layouts students planned on dormscape and shared, hall by hall: to-scale floor plans with the room size, vibe and budget.";
const HALLS = SCHOOLS.reduce((n, s) => n + s.dorms.length, 0);

// Shown on the page and in the FAQPage data, from one list so they always match.
const GALLERY_FAQS = [
  {
    q: "Are these real dorm rooms?",
    a: `Yes. Each layout was planned in dormscape for a real hall, using the room sizes its school publishes, and shared by the student who made it. dormscape covers ${SCHOOLS.length} schools and ${HALLS.toLocaleString("en-US")} halls, and every plan is drawn to scale.`,
  },
  {
    q: "How do I add my layout?",
    a: "Save a design for your hall and tick “Show this layout in the gallery.” It appears on that hall’s page and here. You can take it out any time in My designs.",
  },
  {
    q: "Is my name shown?",
    a: "No. Only the floor plan, room size, vibe, a rounded budget and the month you shared it appear. Approved creators also show their @username.",
  },
];

// The homepage's twelve real rooms (lib/home-data.ts), for the hero deck and the empty board.
const DECK: DeckRoom[] = FEATURED_ROOMS.map((r) => ({
  schoolId: r.schoolId,
  dormId: r.dormId,
  school: r.school,
  hall: r.hall,
  type: r.type,
  lengthFt: r.lengthFt,
  widthFt: r.widthFt,
  sqft: r.sqft,
  lenLabel: feetInches(r.lengthFt),
  widLabel: feetInches(r.widthFt),
  spoken: `${spokenFeet(r.lengthFt)} by ${spokenFeet(r.widthFt)}`,
}));
// 14 px per foot, unless the biggest room wouldn't fit the card's 266 × 208 px drawing area: one scale for all twelve.
const DECK_PX = DECK.length
  ? Math.round(Math.min(14, 266 / Math.max(...DECK.map((r) => r.lengthFt)), 208 / Math.max(...DECK.map((r) => r.widthFt))) * 100) / 100
  : 14;

/** "Double · 15 × 12 ft · Atherton Hall, Penn State" for the layout list in the page data. */
function layoutName(r: GalleryRoom): string {
  const found = getDorm(r.collegeId, r.dormId);
  const place = found ? `${found.dorm.name}, ${shortName(found.school)}` : "";
  return [formatRoomType(r.roomType), formatDims(r.lengthFt, r.widthFt), place].filter(Boolean).join(" · ");
}

/** Floor area in sq ft: the drawn outline's own area when the room was hand-drawn. */
function floorArea(r: GalleryRoom): number {
  const p = r.outline?.points;
  if (!p || p.length < 3) return Math.round(r.lengthFt * r.widthFt);
  const twice = p.reduce((s, a, i) => s + a.x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * a.y, 0);
  return Math.round(Math.abs(twice) / 2);
}

/** What a gallery card needs, worked out here so the browser gets labels and the drawing, never the school data. */
function boardRooms(rooms: GalleryRoom[]): BoardRoom[] {
  // One scale for every card: the longest and widest rooms fill 86% × 80% of a 4:3 frame.
  const k = Math.min((4 * 0.86) / Math.max(...rooms.map((r) => r.lengthFt)), (3 * 0.8) / Math.max(...rooms.map((r) => r.widthFt)));
  return rooms.flatMap((r, i) => {
    const found = getDorm(r.collegeId, r.dormId);
    if (!found) return [];
    const custom = r.style === "custom";
    const meta = styleById(r.style);
    return [
      {
        key: String(i),
        order: i,
        schoolId: r.collegeId,
        dormId: r.dormId,
        school: shortName(found.school),
        hall: found.dorm.name,
        roomType: formatRoomType(r.roomType),
        size: formatDims(r.lengthFt, r.widthFt) ?? "",
        lenLabel: feetInches(r.lengthFt),
        widLabel: feetInches(r.widthFt),
        sqft: floorArea(r),
        lengthFt: r.lengthFt,
        widthFt: r.widthFt,
        fit: Math.round(((r.lengthFt * k) / 4) * 1000) / 10,
        furniture: r.furniture,
        outline: r.outline,
        vibeId: r.style,
        vibe: custom ? "Custom vibe" : meta.name,
        vibeColor: HOME_VIBES.find((v) => v.id === r.style)?.rule ?? meta.palette[2],
        budget: galleryBudget(r.budget),
        shared: sharedMonth(r.sharedAt),
        byline: r.byline,
      },
    ];
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const rooms = await latest();
  return {
    ...pageMetadata({ title: "Dorm room gallery: real layouts by hall", description: DESCRIPTION, path: PATH }),
    // Nothing to show yet: keep the empty page out of search (the sitemap leaves it out too).
    ...(rooms.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GalleryPage() {
  const rooms = await latest();
  const url = absoluteUrl(PATH);
  const board = rooms.length ? boardRooms(rooms) : [];
  const schools = [...new Map(board.map((r) => [r.schoolId, { id: r.schoolId, name: r.school }])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const halls = HALLS.toLocaleString("en-US");
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${url}#webpage`,
            url,
            name: "Room gallery",
            description: DESCRIPTION,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            ...(rooms[0] ? { dateModified: rooms[0].sharedAt } : {}),
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Room gallery", path: PATH },
          ]),
          ...(rooms.length
            ? [itemListJsonLd("Shared dorm room layouts", rooms.map((r) => ({ name: layoutName(r), path: `/colleges/${r.collegeId}/${r.dormId}` })))]
            : []),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: GALLERY_FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />

      <section className={css.hero} aria-labelledby="gallery-title" data-anim="">
        <div className={`ds-wrap ${css.heroGrid}`}>
          <div>
            <p className={css.eyebrow}>Room gallery</p>
            <h1 id="gallery-title" className={css.h1}>
              <span className={css.h1a}>Real rooms,</span>{" "}
              <span className={css.h1b}>shared by students.</span>
            </h1>
            <p className={css.intro}>
              Layouts students planned for their halls and chose to share. Their names and shopping lists stay private, except
              for creators.
            </p>
            <ul className={css.stats}>
              <li>
                <RollingNumber value={String(SCHOOLS.length)} className={css.statNum} />
                <span className={css.statLabel}>Schools</span>
              </li>
              <li>
                <RollingNumber value={halls} className={css.statNum} />
                <span className={css.statLabel}>Halls</span>
              </li>
              <li>
                <span className={css.statSerif}>to scale</span>
                <span className={css.statLabel}>Every room</span>
              </li>
            </ul>
            <div className={css.ctas}>
              <Link href="/plan" className="ds-btn ds-btn--ink">
                Plan your room <ArrowRight size={18} />
              </Link>
              <a href="#how" className="ds-link">
                How the gallery works
              </a>
            </div>
          </div>
          <div className={css.deckCol}>
            <ThrowDeck rooms={DECK} px={DECK_PX} />
            <p className={css.deckCap}>
              {DECK.length} of {halls} halls, drawn to the same scale
            </p>
          </div>
        </div>
      </section>

      <section className={css.board} aria-label="Shared layouts">
        <div className="ds-wrap">
          {board.length ? (
            <GalleryBoard
              rooms={board}
              vibes={STYLES.map((s) => ({ id: s.id, name: s.name }))}
              schools={schools}
              creatorTip={`Verified creator: ${CREATOR_MIN_FOLLOWERS.toLocaleString("en-US")}+ followers`}
            />
          ) : (
            <EmptyBoard halls={DECK.slice(0, 6)} />
          )}
        </div>
      </section>

      <section id="how" className={css.how} aria-labelledby="gallery-answers-title">
        <div className={`ds-wrap ${css.howGrid}`}>
          <div>
            <p className={css.eyebrow}>Questions</p>
            <Headline id="gallery-answers-title" className={`ds-h2 ${css.howTitle}`} lines={[{ text: "How the gallery" }, { text: "works.", serif: true }]} />
            <p className={css.howNote}>
              Room sizes come from each school&rsquo;s housing pages.{" "}
              <Link href="/methodology" className="ds-link">
                How we measure
              </Link>{" "}
              or{" "}
              <Link href="/dorm-room-size" className="ds-link">
                compare typical dorm room sizes
              </Link>
              .
            </p>
          </div>
          <GalleryFaq faqs={GALLERY_FAQS} />
        </div>
      </section>

      <section className={css.band} aria-label="Plan your room">
        <span className={css.bandTape} aria-hidden="true" />
        <div className={`ds-wrap ${css.bandGrid}`}>
          <div>
            <p className={css.motto}>
              <span>Measure. Imagine.</span> <em>Make room.</em>
            </p>
            <p className={css.bandTag}>Your next chapter, planned.</p>
          </div>
          <div className={css.bandCtas}>
            <Link href="/plan" className="ds-btn ds-btn--yellow">
              Plan your room <ArrowRight size={18} />
            </Link>
            <Link href="/colleges" className={`ds-link ${css.bandLink}`}>
              See all supported schools
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
