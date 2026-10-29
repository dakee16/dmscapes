import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import RugCalculator, { type RoomPreset } from "@/components/tools/RugCalculator";
import { SCHOOLS } from "@/lib/schools";
import { dormSizeStats } from "@/lib/dorm-sizes";
import { fitRoom, ft, type FittedRoom } from "@/lib/room-preview";
import { bestRug } from "@/lib/rug-fit";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Rug sizes from the planner's own starting layouts (lib/rug-fit) for the room
// sizes colleges publish (lib/dorm-sizes); nothing is typed in by hand.
const PATH = "/dorm-rug-size";
const S = dormSizeStats(SCHOOLS);
const NAME: Record<number, string> = { 1: "single", 2: "double", 3: "triple" };

const fitOf = (l: number, w: number, o: number) =>
  fitRoom({ type: NAME[o] ?? "double", label: "", occupants: o, length_ft: l, width_ft: w, sqft: null, bed_size: "twin_xl", closet: null }) as FittedRoom;
const rugText = (l: number, w: number, o: number) => {
  const rug = bestRug(fitOf(l, w, o));
  return rug ? `${rug.size[0]} × ${rug.size[1]} ft` : "none";
};

const presets: RoomPreset[] = S.byType.map((t) => ({
  label: `Typical ${NAME[t.occupants]}`,
  l: t.lengthFt,
  w: t.widthFt,
  o: t.occupants,
}));
const [single, double] = S.byType;
const doubleRug = rugText(double.lengthFt, double.widthFt, 2);
const singleRug = rugText(single.lengthFt, single.widthFt, 1);

const rows = [
  ...S.byType.map((t) => ({ room: `Typical ${NAME[t.occupants]}`, l: t.lengthFt, w: t.widthFt, o: t.occupants, note: "median published size" })),
  ...S.commonSizes.map((c) => ({ room: `${ft(c.lengthFt)} × ${ft(c.widthFt)} ft ${NAME[c.occupants]}`, l: c.lengthFt, w: c.widthFt, o: c.occupants, note: `${c.rooms} published rooms` })),
];

export const metadata: Metadata = pageMetadata({
  title: fitTitle(`What Size Rug for a Dorm Room? ${doubleRug} in a Typical Double`, "What Size Rug for a Dorm Room? Rug Size Calculator", "What Size Rug for a Dorm Room?", "Dorm Rug Size Calculator"),
  description: fitDescription(
    `A ${doubleRug} rug fits the open floor of a typical ${ft(double.lengthFt)} × ${ft(double.widthFt)} ft double once the beds, desks and dressers are in. Enter your room to find the biggest rug that fits yours.`,
    `Find the biggest standard rug that fits your dorm room's open floor, around the beds, desks and dressers.`
  ),
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Dorm rug size", path: PATH },
];

const FAQS = [
  {
    q: "What size rug for a dorm room?",
    a: `For a typical ${ft(double.lengthFt)} × ${ft(double.widthFt)} ft double, a ${doubleRug} rug fits the open floor once two beds, desks and dressers are in. For a typical ${ft(single.lengthFt)} × ${ft(single.widthFt)} ft single, it's ${singleRug}. Rooms vary a lot, so enter yours above.`,
  },
  {
    q: "How is the rug size worked out?",
    a: "The room is laid out the way the dormscape planner starts it: a bed, desk and dresser for each person against the walls. The calculator then finds the biggest standard rug (2 × 3 up to 9 × 12 ft) that fits the floor left over without running under furniture or into the door's swing. Desk chairs can sit on the rug.",
  },
  {
    q: "Can a dorm rug go under the bed?",
    a: "It can, and a rug that tucks under the beds can be bigger than this calculator suggests. These sizes keep the whole rug on the open floor, so it lies flat and nothing has to sit on its edge.",
  },
  {
    q: "What if I loft or bunk the beds?",
    a: "Then more floor opens up, and a bigger rug may fit. Plan your room to move the furniture and try a rug in your own layout, and check your school's loft and bunk rules first.",
  },
];

export default function DormRugSizePage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Dorm rug size calculator",
            url: absoluteUrl(PATH),
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow="Dorm rug size calculator"
        lines={[
          { text: "What size rug", riso: true },
          { text: "fits your dorm?", serif: true },
        ]}
        lede={
          <p>
            In a typical {ft(double.lengthFt)} × {ft(double.widthFt)} ft double, a{" "}
            <mark className="ds-marker" data-mark="load">
              {doubleRug} rug
            </mark>{" "}
            fits the floor that&apos;s left once the beds, desks and dressers are in. Enter your room to see the biggest rug
            that fits yours, drawn to scale.
          </p>
        }
      />

      <section className="ds-section" aria-labelledby="calc-title">
        <div className="ds-wrap">
          <Headline id="calc-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Your room," }, { text: "your rug.", serif: true }]} />
          <Suspense fallback={null}>
            <RugCalculator presets={presets} />
          </Suspense>
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="table-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Rug sizes for common dorm rooms
          </p>
          <Headline id="table-title" className="ds-h2 ds-h2--inline" lines={[{ text: "The rooms schools" }, { text: "publish most.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Size</th>
                  <th scope="col">Biggest rug that fits</th>
                  <th scope="col">Why this room</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.room}>
                    <th scope="row">{r.room}</th>
                    <td>
                      {ft(r.l)} × {ft(r.w)} ft
                    </td>
                    <td>{rugText(r.l, r.w, r.o)}</td>
                    <td>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            From {S.rooms.toLocaleString("en-US")} room sizes published by {S.schools} colleges, laid out the way the planner
            starts them. See{" "}
            <Link href="/dorm-room-size" className="ds-link">
              dorm room sizes
            </Link>{" "}
            for the full numbers.
          </p>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="answers-title">
        <div className="ds-wrap">
          <Headline id="answers-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Short answers," }, { text: "real rooms.", serif: true }]} />
          <div className={dsz.answers}>
            {FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <p className={dsz.caption} style={{ marginTop: 32 }}>
            Thinking about a loft?{" "}
            <Link href="/loft-bed-clearance" className="ds-link">
              See what fits under a lofted bed
            </Link>{" "}
            and{" "}
            <Link href="/dorm-bed-rules" className="ds-link">
              your school&apos;s loft and bunk rules
            </Link>
            .
          </p>
        </div>
      </section>

      <CtaBand lead="The rug is easy." tail="Plan the rest." note="Find your hall, see your room drawn to scale, and try a rug in your own layout.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
