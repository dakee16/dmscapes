import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import StickyMobileCta from "@/components/site/StickyMobileCta";
import JsonLd from "@/components/site/JsonLd";
import HomeHero from "@/components/home/HomeHero";
import TapeBand from "@/components/home/TapeBand";
import ProblemSection from "@/components/home/ProblemSection";
import HowSection from "@/components/home/HowSection";
import VibesSection from "@/components/home/VibesSection";
import BudgetSection from "@/components/home/BudgetSection";
import StudioSection from "@/components/home/StudioSection";
import TogetherSection from "@/components/home/TogetherSection";
import SchoolsSection from "@/components/home/SchoolsSection";
import PricingSection from "@/components/home/PricingSection";
import FinalCta from "@/components/home/FinalCta";
import {
  pageMetadata,
  organizationJsonLd,
  webSiteJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { SCHOOLS } from "@/lib/schools";
import {
  FEATURED_ROOMS,
  HALL_COUNT,
  HOME_VIBES,
  LAYOUT_COUNT,
  SCHOOL_COUNT,
} from "@/lib/home-data";

// Short enough that Google shows it whole.
const TITLE = "Dormscape: Free Dorm Room Planner";

export const metadata = pageMetadata({
  title: TITLE,
  absoluteTitle: true,
  description: `Free dorm room planner with real room dimensions for ${SCHOOLS.length} schools. Lay out your room in 2D or 3D, set a budget and get a shoppable list.`,
  path: "/",
  ogTitle: "dormscape: your dorm room, planned before move-in day",
});

export default function Home() {
  return (
    <div id="top" className="ds">
      <JsonLd
        data={[
          organizationJsonLd(),
          webSiteJsonLd(),
          // The image search results should prefer for the homepage: the final
          // section's room-with-its-door-open (clearer as a small thumbnail than
          // the hero's room-over-plan). Social cards keep og.png.
          webPageJsonLd({ path: "/", name: TITLE, image: { path: "/redesign/home-cta-room-door.jpg", width: 960, height: 1200 } }),
          softwareApplicationJsonLd(),
        ]}
      />
      <Nav overlay />
      <main id="page-content" tabIndex={-1}>
        <HomeHero schoolCount={SCHOOL_COUNT} hallCount={HALL_COUNT} />
        <TapeBand layoutCount={LAYOUT_COUNT} />
        <ProblemSection />
        <HowSection />
        <VibesSection vibes={HOME_VIBES} />
        <BudgetSection />
        <StudioSection />
        <TogetherSection />
        <SchoolsSection rooms={FEATURED_ROOMS} schoolCount={SCHOOL_COUNT} />
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
}
