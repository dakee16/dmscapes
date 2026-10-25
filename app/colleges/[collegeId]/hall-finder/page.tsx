import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageShell from "@/components/ds/PageShell";
import JsonLd from "@/components/site/JsonLd";
import HallFinder from "@/components/hall-finder/HallFinder";
import { FinderShell } from "@/components/hall-finder/FinderHead";
import SchoolFacts from "@/components/hall-finder/SchoolFacts";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { breadcrumbJsonLd, fitDescription, fitTitle, pageMetadata } from "@/lib/seo";
import { PILOT_SCHOOLS, hallFinderLive, rankedHalls } from "@/lib/hall-finder";
import { loadCampus } from "@/lib/hall-finder-server";
import { datedPageJsonLd, hallFinderAppJsonLd, schoolFaqs } from "@/lib/hall-finder-seo";
import { faqPageJsonLd } from "@/lib/blog";

// Hall Finder for one pilot school (design-handoff/hall-finder). Static per pilot; any other
// college is a 404. Until NEXT_PUBLIC_HALL_FINDER=on the page is noindex and unlinked.
export const dynamicParams = false;

export function generateStaticParams() {
  return PILOT_SCHOOLS.map((collegeId) => ({ collegeId }));
}

export async function generateMetadata(props: { params: Promise<{ collegeId: string }> }): Promise<Metadata> {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school) return {};
  const short = shortName(school);
  return pageMetadata({
    title: fitTitle(`${short} Hall Finder: Rank Dorms by Walk to Class`, `${short} Hall Finder: Dorms by Walk to Class`, `${short} Hall Finder`),
    description: fitDescription(
      `Add the buildings you have classes in and rank ${short}'s residence halls by your weekly walk, on a map with real walking routes.`,
      `Rank ${short} residence halls by your weekly walk to class, with real walking routes.`,
    ),
    path: `/colleges/${collegeId}/hall-finder`,
    noIndex: !hallFinderLive(),
  });
}

export default async function HallFinderPage(props: { params: Promise<{ collegeId: string }> }) {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school || !PILOT_SCHOOLS.includes(collegeId)) notFound();
  const data = await loadCampus(collegeId);
  if (!data) notFound();
  const { campus, facts } = data;
  const short = shortName(school);
  const ranked = rankedHalls(campus);
  // Screenshot and PDF reading needs the server's Anthropic key (read at build; adding the key on
  // Vercel redeploys). Without it, uploads stay .ics only.
  const imagesOn = Boolean(process.env.ANTHROPIC_API_KEY);
  const areas = [...new Set(campus.halls.filter((h) => h.lng !== null && h.lat !== null).map((h) => facts[h.dormId]?.area).filter((a): a is string => Boolean(a)))].sort();
  const faqs = schoolFaqs({ short, ranked, areas, imagesOn });
  const path = `/colleges/${collegeId}/hall-finder`;
  const appLd = hallFinderAppJsonLd({
    collegeId,
    short,
    schoolName: school.name,
    city: school.city ?? null,
    state: school.state ?? null,
    ranked,
    dateModified: campus.generatedAt,
    description: `Rank ${school.name} residence halls by the weekly walk to your classes, with walking routes on a map.`,
  });
  const crumbs = [
    { name: "Colleges", path: "/colleges" },
    { name: short, path: `/colleges/${collegeId}` },
    { name: "Hall Finder", path: `/colleges/${collegeId}/hall-finder` },
  ];
  return (
    <PageShell>
      <JsonLd data={[breadcrumbJsonLd(crumbs), datedPageJsonLd({ path, name: `${short} Hall Finder`, dateModified: campus.generatedAt, mainEntity: appLd["@id"] }), appLd, faqPageJsonLd(faqs)]} />
      {/* The finder reads the page address (useSearchParams), so it renders in the browser; until
          then the heading and intro below are what is in the page, and SchoolFacts adds the rest. */}
      <Suspense fallback={<FinderShell collegeId={collegeId} schoolName={short} />}>
        <HallFinder campus={campus} facts={facts} schoolName={short} imagesOn={imagesOn} />
      </Suspense>
      <SchoolFacts collegeId={collegeId} short={short} schoolName={school.name} campus={campus} facts={facts} ranked={ranked} imagesOn={imagesOn} faqs={faqs} />
    </PageShell>
  );
}
