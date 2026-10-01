import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import BlindPlans from "@/components/about/BlindPlans";
import { SCHOOLS } from "@/lib/schools";
import { STYLES } from "@/lib/styles";
import css from "@/components/about/About.module.css";

export const metadata: Metadata = {
  description:
    "Dormscape is a free dorm room planner built on real dorm dimensions from official housing data. See your exact room, set a budget, shop a list that fits.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About dormscape",
    description:
      "The free dorm room planner built on real dorm dimensions. Why it exists, how it works, and how it stays free.",
    siteName: "Dormscape",
    type: "website",
    url: "/about",
    images: [
      {
        url: "/og.png?v=folded-room",
        width: 1200,
        height: 630,
        alt: "Dormscape, the free AI dorm room planner",
      },
    ],
  },
};

// Real, shipped numbers only: every room type in the index is a mapped layout.
const LAYOUTS = SCHOOLS.reduce((n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0), 0);
const fmt = (n: number) => n.toLocaleString("en-US");

const STEPS = [
  {
    title: "Pick your school",
    body: "We already have your building and room, pulled from official housing data.",
  },
  {
    title: "Choose a vibe and budget",
    body: "Set the look you want and the number you can spend. The plan stays inside it.",
  },
  {
    title: "Get a layout and list",
    body: "A room arranged to the inch, plus real products with live links you can shop.",
  },
];

export default function AboutPage() {
  const stats = [
    { label: "Schools supported", n: SCHOOLS.length },
    { label: "Dorm layouts mapped", n: LAYOUTS },
    { label: "Preset styles", n: STYLES.length },
  ];

  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-warm)"
        size="md"
        className={css.hero}
        eyebrow="About dormscape"
        lines={[
          { text: "The dorm planner that", riso: true },
          { text: "knows your dorm.", serif: true },
        ]}
        lede={
          <p>
            Dormscape is a free dorm room planner. Pick your school and building, and you get your actual room: real
            dimensions, a layout you can rearrange, and a shopping list that fits the space and the budget.
          </p>
        }
        visual={
          <dl className={css.stats}>
            {stats.map((s) => (
              <div key={s.label} className={css.stat}>
                <dt>{s.label}</dt>
                <dd className="ds-num" data-count={s.n} data-count-on="load">
                  {fmt(s.n)}
                </dd>
              </div>
            ))}
          </dl>
        }
      />

      <section className="ds-section" aria-labelledby="problem-title">
        <div className="ds-wrap">
          <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="">
            The problem
          </p>
          <div className={css.problemHead}>
            <Headline
              id="problem-title"
              className="ds-h2 ds-h2--inline"
              lines={[{ text: "Buying" }, { text: "blind.", serif: true }]}
            />
            <div className={css.problemCopy} data-reveal="">
              <p className="ds-lede">
                Every fall, freshmen furnish a room they&rsquo;ve never stood in. The results are predictable.
              </p>
              <p>
                The usual fix is a dozen browser tabs: a generic packing list, a housing PDF, three store carts, and a
                group chat poll. Hours of work to still end up guessing.
              </p>
            </div>
          </div>
          <BlindPlans />
        </div>
      </section>

      <section className={`ds-section ${css.does}`} aria-labelledby="does-title">
        <div className="ds-wrap">
          <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="">
            What Dormscape does
          </p>
          <Headline
            id="does-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "We do the tape-measure" }, { text: "homework.", serif: true }]}
          />
          <div className={css.doesCopy} data-reveal="">
            <p className="ds-lede">
              Dormscape starts from your exact room, with dimensions pulled from official university housing data for{" "}
              <Link href="/colleges" className="ds-link">
                {SCHOOLS.length} schools
              </Link>{" "}
              and counting.
            </p>
            <p>
              From there you pick a style that feels like you, set a budget, and get a layout plus a list of real
              products that fit it. Drag the furniture around, swap products, share the result. That&rsquo;s the pitch.
              The proof is in{" "}
              <Link href="/plan" className="ds-link">
                the planner
              </Link>
              .
            </p>
          </div>

          <h3 className={`ds-eyebrow ${css.diffLabel}`} data-reveal="">
            Why it&rsquo;s not another checklist
          </h3>
          <ul className={css.diffs}>
            <li data-reveal="">
              <div className={css.diff}>
                <div className={css.diffArt} aria-hidden="true">
                  <span className={css.tapeArt} data-draw="" />
                </div>
                <h4 className={css.diffTitle}>Real dimensions</h4>
                <p className={css.diffSub}>Measured, not guessed.</p>
                <p className={css.diffBody}>
                  Room sizes come from official housing data, school by school. When a college doesn&rsquo;t publish a
                  number, we leave it blank instead of inventing one.{" "}
                  <Link href="/methodology" className="ds-link">
                    How we measure
                  </Link>
                  .
                </p>
              </div>
            </li>
            <li data-reveal="" style={{ "--i": 1 } as React.CSSProperties}>
              <div className={css.diff}>
                <div className={css.diffArt} aria-hidden="true">
                  <span className={css.layoutArt} data-grow="" style={{ "--i": 2 } as React.CSSProperties}>
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <h4 className={css.diffTitle}>Visual layout</h4>
                <p className={css.diffSub}>A room, not a list.</p>
                <p className={css.diffBody}>
                  You see your stuff in your floor plan before you buy any of it. The rug that doesn&rsquo;t fit gets
                  caught on screen, not on move-in day.
                </p>
              </div>
            </li>
            <li data-reveal="" style={{ "--i": 2 } as React.CSSProperties}>
              <div className={css.diff} data-tone="ink">
                <div className={css.diffArt} aria-hidden="true">
                  <span className={`ds-num ${css.budgetArt}`}>$650</span>
                </div>
                <h4 className={css.diffTitle}>Budget first</h4>
                <p className={css.diffSub}>Your number, respected.</p>
                <p className={css.diffBody}>
                  Set a budget up front and the plan stays inside it. Every item is a real product with a live link, not
                  stock-photo inspiration.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className={`ds-section ${css.who}`} aria-labelledby="who-title">
        <div className="ds-wrap">
          <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="">
            Who it&rsquo;s for
          </p>
          <Headline id="who-title" className={`ds-h2 ${css.whoTitle}`} lines={[{ text: "Incoming freshmen, mostly." }]} />
          <p className={css.whoQuote} data-reveal="">
            If you just committed and the roommate group chat is already <mark>debating mini fridges</mark>,
            you&rsquo;re exactly who we built this for.
          </p>
          <div className={css.whoMore} data-reveal="">
            <p>Students moving into first apartments are next on the list. Same idea, more rooms.</p>
            <p>
              School not on{" "}
              <Link href="/colleges" className="ds-link">
                the list
              </Link>{" "}
              yet?{" "}
              <Link href="/add-school" className="ds-link">
                Add it
              </Link>{" "}
              and we&rsquo;ll get measuring.
            </p>
          </div>
        </div>
      </section>

      <section className="ds-section" aria-label="How it works and pricing">
        <div className={`ds-wrap ${css.howGrid}`}>
          <div>
            <Headline
              id="how-title"
              className="ds-h2 ds-h2--inline"
              lines={[{ text: "How it" }, { text: "works.", serif: true }]}
            />
            <ol className={css.steps}>
              {STEPS.map((step, i) => (
                <li key={step.title} className={css.step} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
                  <span className={css.stepRule} data-draw="" style={{ "--i": i } as React.CSSProperties} aria-hidden="true" />
                  <span className={css.stepNum}>Step {i + 1}</span>
                  <h3 className={css.stepTitle}>{step.title}</h3>
                  <p className={css.stepBody}>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className={css.free} data-reveal="">
            <Headline
              id="free-title"
              className="ds-h3 ds-h2--inline"
              lines={[{ text: "Start" }, { text: "free.", serif: true }]}
            />
            <p>
              Explore in 2D for free. Create an account for your first room plan and unlimited saving. Some shopping
              links are affiliate links, which pay us a small commission at no extra cost to you.{" "}
              <Link href="/pricing" className="ds-link">
                Plus and Pro
              </Link>{" "}
              are optional one-time upgrades for more plans and tools, including exports, custom vibes, and 3D room
              building and planning.
            </p>
          </div>
        </div>
      </section>

      <CtaBand tone="amber" lead="Your next room" tail="starts here." note="One free plan · Make it yours">
        <PlanCta
          className="ds-btn ds-btn--ink-yellow ds-btn--lg"
          freeLabel="Plan my room for free"
          icon={<ArrowRight size={20} />}
        />
      </CtaBand>
    </PageShell>
  );
}
