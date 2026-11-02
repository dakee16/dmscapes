import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import { GalleryCard } from "@/components/hall/HallGallery";
import GalleryGrid from "@/components/growth/GalleryGrid";
import { ArrowRight } from "@/components/ds/Icons";
import { recentGallery } from "@/lib/gallery";
import { getDorm } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { pageMetadata } from "@/lib/seo";
import g from "@/components/growth/Growth.module.css";

// Every hall's shared layouts, newest first (lib/gallery.ts). Re-rendered at most
// every 10 minutes; hall pages show their own six.
export const revalidate = 600;
const latest = cache(() => recentGallery(24));

export async function generateMetadata(): Promise<Metadata> {
  const rooms = await latest();
  return {
    ...pageMetadata({
      title: "Dorm room gallery",
      description: "Real dorm room layouts students planned on dormscape and chose to share, hall by hall.",
      path: "/gallery",
    }),
    // Nothing to show yet: keep the empty page out of search.
    ...(rooms.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GalleryPage() {
  const rooms = await latest();
  return (
    <PageShell navOverlay>
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
    </PageShell>
  );
}
