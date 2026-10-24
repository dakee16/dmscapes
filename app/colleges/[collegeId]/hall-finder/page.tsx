import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageShell from "@/components/ds/PageShell";
import JsonLd from "@/components/site/JsonLd";
import HallFinder from "@/components/hall-finder/HallFinder";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { breadcrumbJsonLd, fitDescription, fitTitle, pageMetadata } from "@/lib/seo";
import { PILOT_SCHOOLS, hallFinderLive, type Campus } from "@/lib/hall-finder";
import { hallFacts, readSchoolDorms } from "@/lib/hall-finder-server";

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
  const campus = JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "campus", `${collegeId}.json`), "utf8")) as Campus;
  const facts = hallFacts(await readSchoolDorms(collegeId));
  const short = shortName(school);
  const crumbs = [
    { name: "Colleges", path: "/colleges" },
    { name: short, path: `/colleges/${collegeId}` },
    { name: "Hall Finder", path: `/colleges/${collegeId}/hall-finder` },
  ];
  return (
    <PageShell>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />
      <Suspense fallback={null}>
        {/* Screenshot and PDF reading needs the server's Anthropic key (read at build;
            adding the key on Vercel redeploys). Without it, uploads stay .ics only. */}
        <HallFinder campus={campus} facts={facts} schoolName={short} imagesOn={Boolean(process.env.ANTHROPIC_API_KEY)} />
      </Suspense>
    </PageShell>
  );
}
