import HomeHero from "@/components/experience/HomeHero";
import AssemblyStory from "@/components/experience/AssemblyStory";
import Link from "next/link";
import Nav from "@/components/Nav";
import TwoWaysToPlan from "@/components/site/TwoWaysToPlan";
import Vibes from "@/components/Vibes";
import CreateVibePromo from "@/components/site/CreateVibePromo";
import Schools from "@/components/Schools";
import PlusPitch from "@/components/site/PlusPitch";
import PlanCta from "@/components/site/PlanCta";
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

export const metadata = pageMetadata({
  title: "Dormscape: Free Dorm Room Planner With Real Dorm Dimensions",
  absoluteTitle: true,
  description: `Plan your college dorm room before move-in. Find your exact room across ${SCHOOLS.length} schools and ${DORM_COUNT} residence halls, get a layout that fits it, set your style and budget, and leave with a shoppable list. Free.`,
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
        <HomeHero />
        <AssemblyStory />
        <TwoWaysToPlan />
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
            <p>The short version of what people ask most.</p>
          </Reveal>
          <div>
            <HomeFaq />
            <p className="dm-faq-after">
              Still curious? <Link href="/faq">Read the full FAQ</Link> or{" "}
              <Link href="/contact">get in touch</Link>.
            </p>
          </div>
        </section>
        <section className="dm-final-cta dm-section">
          <div className="dm-eyebrow">
            <span>Dorm ready under a minute.</span>
            <span>Your room is waiting.</span>
          </div>
          <Link href="/plan">
            <span>
              Make <em>room.</em>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
          <div>
            <PlanCta />
            <span>No account needed.</span>
          </div>
        </section>
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
}
