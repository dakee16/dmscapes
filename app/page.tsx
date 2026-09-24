import StudioShowcase from "@/components/experience/StudioShowcase";
import HomeHero from "@/components/experience/HomeHero";
import AssemblyStory from "@/components/experience/AssemblyStory";
import Link from "next/link";
import Nav from "@/components/Nav";
import LaunchVideo from "@/components/site/LaunchVideo";
import Vibes from "@/components/Vibes";
import CreateVibePromo from "@/components/site/CreateVibePromo";
import Schools from "@/components/Schools";
import PlusPitch from "@/components/site/PlusPitch";
import Footer from "@/components/Footer";
import Reveal from "@/components/site/Reveal";
import HomeFaq from "@/components/site/HomeFaq";
import StickyMobileCta from "@/components/site/StickyMobileCta";
import JsonLd from "@/components/site/JsonLd";
import {
  pageMetadata,
  organizationJsonLd,
  webSiteJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo";
import { SCHOOLS } from "@/lib/schools";

const DORM_COUNT = SCHOOLS.reduce((n, s) => n + s.dorms.length, 0);
const LAYOUT_COUNT = SCHOOLS.reduce((n, s) => n + s.dorms.reduce((total, d) => total + d.rooms.length, 0), 0);

export const metadata = pageMetadata({
  title: "Dormscape: Free Dorm Room Planner With Real Dorm Dimensions",
  description: `Plan your college dorm room before move-in. Find your exact room across ${SCHOOLS.length} schools and ${DORM_COUNT} residence halls, get a layout that fits it, set your style and budget, and leave with a shoppable list. Start free in 2D; explore live 3D with Pro.`,
  path: "/",
  ogTitle: "dormscape: your dorm room, planned before move-in day",
});

export default function Home() {
  return (
    <div id="top" className="dm-home">
      <JsonLd
        data={[
          organizationJsonLd(),
          webSiteJsonLd(),
          softwareApplicationJsonLd(),
        ]}
      />
      <Nav />
      <main id="page-content" tabIndex={-1}>
        <HomeHero collegeCount={SCHOOLS.length} layoutCount={LAYOUT_COUNT} />
        <StudioShowcase />
        <AssemblyStory />
        <LaunchVideo />
        <Vibes />
        <CreateVibePromo />
        <Schools />
        <PlusPitch />
        <section className="dm-faq-section dm-section">
          <Reveal className="dm-section-heading">
            <p className="dm-eyebrow">05 / Frequently asked</p>
            <h2>
              Questions,
              <br />
              <em>answered.</em>
            </h2>
          </Reveal>
          <div>
            <HomeFaq />
            <p className="dm-faq-after">
              <Link href="/faq">Full FAQ</Link> ·{" "}
              <Link href="/contact">Contact us</Link>
            </p>
          </div>
        </section>
        <section className="dm-final-cta dm-section">
          <Link href="/plan">
            <span>
              Make <em>room.</em>
            </span>
            <span aria-hidden="true">↗︎</span>
          </Link>
        </section>
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
}
