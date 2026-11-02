import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import JsonLd from "@/components/site/JsonLd";
import { GalleryCard } from "@/components/hall/HallGallery";
import GalleryGrid from "@/components/growth/GalleryGrid";
import { ArrowRight } from "@/components/ds/Icons";
import { recentGallery, type GalleryRoom } from "@/lib/gallery";
import { SCHOOLS, getDorm } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { formatRoomType } from "@/lib/format";
import { formatDims } from "@/lib/schools";
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd, pageMetadata, SITE_URL } from "@/lib/seo";
import g from "@/components/growth/Growth.module.css";
import dsz from "@/components/dorm-size/DormSize.module.css";

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

/** "Double · 15 × 12 ft · Atherton Hall, Penn State" for the layout list in the page data. */
function layoutName(r: GalleryRoom): string {
  const found = getDorm(r.collegeId, r.dormId);
  const place = found ? `${found.dorm.name}, ${shortName(found.school)}` : "";
  return [formatRoomType(r.roomType), formatDims(r.lengthFt, r.widthFt), place].filter(Boolean).join(" · ");
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
      <PageHero
        size="md"
        eyebrow="Room gallery"
        lines={[{ text: "Real rooms," }, { text: "shared by students.", serif: true }]}
        lede="Layouts students planned for their halls and chose to share. Their names and shopping lists stay private, except for creators."
      />
      <section className="ds-section" aria-label="Shared layouts">
        <div className="ds-wrap">
          {rooms.length ? (
            <>
              <GalleryGrid label="Shared layouts">
                {rooms.map((r, i) => {
                  const found = getDorm(r.collegeId, r.dormId);
                  const place = found
                    ? { label: `${shortName(found.school)} · ${found.dorm.name}`, href: `/colleges/${r.collegeId}/${r.dormId}` }
                    : undefined;
                  return <GalleryCard key={i} room={r} place={place} />;
                })}
              </GalleryGrid>
              <div className={g.galleryCta}>
                <Link href="/plan" className="ds-btn ds-btn--ink-yellow">
                  Plan your room <ArrowRight size={18} />
                </Link>
              </div>
            </>
          ) : (
            // Glow border (Vengeance UI Glow Border Card): the empty gallery invites the first layout.
            <div className={g.emptyGlow}>
              <div className={g.emptyInner}>
                <p className={g.emptyKicker}>Nothing shared yet</p>
                <h2 className={g.emptyTitle}>Be the first in your hall.</h2>
                <ol className={g.emptySteps}>
                  <li><b>1</b>Plan a room for your hall.</li>
                  <li><b>2</b>Save it to your account.</li>
                  <li><b>3</b>Tick &ldquo;Show this layout in the gallery.&rdquo;</li>
                </ol>
                <Link href="/plan" className="ds-btn ds-btn--ink-yellow">
                  Plan your room <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="ds-section" aria-labelledby="gallery-answers-title">
        <div className="ds-wrap">
          <Headline id="gallery-answers-title" className="ds-h2 ds-h2--inline" lines={[{ text: "How the gallery" }, { text: "works.", serif: true }]} />
          <div className={dsz.answers}>
            {GALLERY_FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <p className={dsz.caption} style={{ marginTop: 32 }}>
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
      </section>
    </PageShell>
  );
}
