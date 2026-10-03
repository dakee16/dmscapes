import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight, Check } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import UpgradeButton from "@/components/site/UpgradeButton";
import { SCHOOLS } from "@/lib/schools";
import { STYLES } from "@/lib/styles";
import { POSTS } from "@/content/blog";
import {
  PLUS_PRICE_USD,
  PLUS_INITIAL_CREDITS,
  PRO_INITIAL_CREDITS,
  RECHARGE_CREDITS,
  PLUS_PRICE_WAS_USD,
  PRO_PRICE_USD,
  PRO_PRICE_WAS_USD,
  RECHARGE_PRICE_USD,
  FLEX_CREDIT_PRICE_USD,
  FREE_PLAN_CAP,
} from "@/lib/plan";
import css from "@/components/pricing/Pricing.module.css";

// Real, honest social proof: counts derived straight from the shipped data, so
// they can never drift from what we actually support. No fabricated reviews or
// ratings. The floored layout count is the headline stat cited across the site.
const ROOM_LAYOUTS = SCHOOLS.reduce(
  (n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0),
  0
);
// Rounded down to a clean floor so the claim stays conservative (e.g. 1,026 -> 1,000+).
const ROOM_LAYOUTS_FLOOR = Math.floor(ROOM_LAYOUTS / 100) * 100;

const DESCRIPTION =
  `Try Dormscape free. Plus includes ${PLUS_INITIAL_CREDITS} plan credits for $${PLUS_PRICE_USD.toFixed(2)}. Pro includes ${PRO_INITIAL_CREDITS} plan credits, custom vibes, and 3D tools for $${PRO_PRICE_USD.toFixed(2)}. One-time purchases.`;

export const metadata: Metadata = {
  title: "Pricing: Free, Plus and Pro",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing",
    description: DESCRIPTION,
    siteName: "Dormscape",
    type: "website",
    url: "/pricing",
    images: [
      {
        url: "/og.png?v=folded-room",
        width: 1200,
        height: 630,
        alt: "Dormscape, the free AI dorm room planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description: DESCRIPTION,
    images: ["/og.png?v=folded-room"],
  },
};

const usd = (n: number) => `$${n.toFixed(2)}`;
const FREE_VIBES = STYLES.filter((s) => !s.plus);
const ALL_VIBES = STYLES.length;

// Free-tier perks: only what genuinely ships today, and all of it is real.
const FREE_PERKS: React.ReactNode[] = [
  <>
    Real room dimensions for{" "}
    <Link href="/colleges" className="ds-link">
      supported schools
    </Link>
  </>,
  <>1 generated room plan to try it out</>,
  <>Personal workspaces with a 2D furniture library</>,
  <>My rooms: save and organize your designs, free</>,
  <>3 vibes: Minimalist, Cozy Aesthetic, and Preppy</>,
  <>Budget-aware product picks with live Amazon links</>,
  <>Drag-and-drop 2D layout with editable measurements</>,
  <>Share any room with a link</>,
  <>No account needed to start planning</>,
];

// Plus perks: the one-time unlock. Plan generation is metered by plan credits;
// saving is free, and features are forever.
const PLUS_PERKS: { title: string; body: string }[] = [
  {
    title: `${PLUS_INITIAL_CREDITS} plan credits`,
    body: `One credit per generated room plan. Recharge ${RECHARGE_CREDITS} more for $${RECHARGE_PRICE_USD.toFixed(2)}. Manual arrangements and saving your designs use no credits.`,
  },
  {
    title: "All 9 vibes",
    body: "Academia, Y2K, Gamer, Team Spirit, Retro, and Pastel, plus the three free styles.",
  },
  {
    title: "Add your own products",
    body: "Paste any Amazon product link to pull your own items into your room, budget, and layout, on top of our curated picks.",
  },
  {
    title: "Draw your own room",
    body: "Not on our list, or an odd shape? Sketch your exact floor plan, even an L-shape, with doors, windows, and closets, and we fit a full layout to it.",
  },
  {
    title: "PDF and PNG export",
    body: "Download your shopping list as a clean PDF, or your room layout as an image.",
  },
  {
    title: "Compare two designs side by side",
    body: "Line up two rooms with their budgets and totals to settle which one wins.",
  },
  {
    title: "Priority on add-my-school requests",
    body: "Your school jumps to the front of the queue when we build the next batch.",
  },
];

// Pro includes a larger generation allowance and permanent access to its tools.
const PRO_PERKS: { title: string; body: string }[] = [
  {title: "A shared room for your people", body: "Host one active shared workspace with up to four people, including you. Friends join free with editing or comment access. Keep a shared shopping list, purchasing assignments, comments, and room versions."},
  {title: "3D Room Builder", body: "Build your own room on a 3D grid. Place a floor, draw custom walls, and add doors and windows. Your room carries straight into 3D planning. Pro only."},
  {title: "Live 3D Room Studio", body: "Arrange furniture, explore room, top, and inside views, and try finishes and lighting. Switch between the same 2D and 3D layout. Included with Pro, available now."},
  {
    title: `${PRO_INITIAL_CREDITS} plan credits`,
    body: `${PRO_INITIAL_CREDITS} included credits for new room plans. Top up for $${FLEX_CREDIT_PRICE_USD.toFixed(2)} per credit. Your Pro tools and saved designs remain available at zero.`,
  },
  {
    title: "Create your own vibe",
    body: "Skip the nine presets. Describe any aesthetic in your own words and we match real products to it, live. Pro only.",
  },
  {
    title: "Everything in Plus",
    body: "All 9 vibes, PDF and PNG export, side-by-side comparison, and priority school requests.",
  },
  {
    title: "No subscription",
    body: "One payment unlocks Pro tools permanently. Plan generation uses credits, which you can top up separately. No recurring payments.",
  },
];

const NEVER = [
  "Editing furniture",
  "Building or editing a room shell",
  "Saving",
  "Sharing",
  "Exporting",
  "Comparing",
  "Switching between 2D and 3D",
  "Invitations",
];

type Cell = string | boolean;
const TABLE: { feature: string; free: Cell; plus: Cell; pro: Cell }[] = [
  { feature: "Plan credits", free: String(FREE_PLAN_CAP), plus: String(PLUS_INITIAL_CREDITS), pro: String(PRO_INITIAL_CREDITS) },
  { feature: "Preset vibes", free: String(FREE_VIBES.length), plus: String(ALL_VIBES), pro: String(ALL_VIBES) },
  { feature: "Real room dimensions, 2D layout, live Amazon links", free: true, plus: true, pro: true },
  { feature: "Save and share", free: true, plus: true, pro: true },
  { feature: "Draw your own room", free: false, plus: true, pro: true },
  { feature: "Add your own products", free: false, plus: true, pro: true },
  { feature: "PDF and PNG export", free: false, plus: true, pro: true },
  { feature: "Compare two designs side by side", free: false, plus: true, pro: true },
  { feature: "Priority on add-my-school requests", free: false, plus: true, pro: true },
  { feature: "A shared room for your people", free: false, plus: false, pro: true },
  { feature: "3D Room Builder", free: false, plus: false, pro: true },
  { feature: "Live 3D Room Studio", free: false, plus: false, pro: true },
  { feature: "Create your own vibe", free: false, plus: false, pro: true },
  {
    feature: "More credits",
    free: `Flex, ${usd(FLEX_CREDIT_PRICE_USD)} each`,
    plus: `${RECHARGE_CREDITS} for ${usd(RECHARGE_PRICE_USD)}`,
    pro: `${usd(FLEX_CREDIT_PRICE_USD)} each`,
  },
];

const BEFORE_YOU_PAY = [
  "Is the Dormscape planner still free?",
  "What uses a Dormscape plan credit?",
  "What is the difference between Plus and Pro?",
  "What happens when Pro credits run out?",
];
const ALL_FAQS = POSTS.flatMap((p) => p.faqs ?? []);
const FAQS = BEFORE_YOU_PAY.map((q) => ALL_FAQS.find((f) => f.q === q)).filter(
  (f): f is { q: string; a: string } => Boolean(f)
);

function cell(v: Cell, label: string) {
  if (v === true) return <><Check size={16} /><span className="ds-sr">Included</span></>;
  if (v === false) return <><span aria-hidden="true">—</span><span className="ds-sr">Not in {label}</span></>;
  return v;
}

/** The hero ruler: each tier sits at its price along a strip of tape. */
function PriceRuler() {
  const max = PRO_PRICE_USD;
  const at = (p: number) => `${(p / max) * 100}%`;
  return (
    <div className={css.ruler} aria-hidden="true">
      <div className={css.rulerTape}>
        <span className={css.mark} data-pos="up" style={{ left: at(0) }}>
          <b>$0</b>
          <small>Free</small>
        </span>
        <span className={css.mark} data-pos="down" data-tone="ink" style={{ left: at(PLUS_PRICE_USD) }}>
          <b>{usd(PLUS_PRICE_USD)}</b>
          <small>Plus · once</small>
        </span>
        <span className={css.mark} data-pos="up" data-tone="blue" style={{ left: at(PRO_PRICE_USD) }}>
          <b>{usd(PRO_PRICE_USD)}</b>
          <small>Pro · once</small>
        </span>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-sky)"
        size="md"
        className={css.hero}
        eyebrow="Pricing · one-time, no subscription"
        lines={[
          { text: "Free to plan.", riso: true },
          { text: "Pay once to go further.", serif: true },
        ]}
        lede={
          <p>
            Start with one free room plan. No trial timer, no card. Upgrade when you&apos;re ready to explore more
            possibilities.
          </p>
        }
        visual={<PriceRuler />}
      />

      <section className={css.plansSection} aria-label="Plans">
        <div className="ds-wrap">
          <div id="plans" className={css.plans} data-stagger="">
            {/* FREE */}
            <article className={`${css.plan} ${css.free}`} data-reveal="" aria-labelledby="plan-free">
              <div className={css.planTop}>
                <h2 id="plan-free">Free</h2>
                <span className={css.tag}>No card</span>
              </div>
              <p className={css.priceRow}>
                <span className={css.price}>$0</span>
                <span className={css.cadence}>forever</span>
              </p>
              <p className={css.pitch}>Try the planner on the house: one room plan, with free unlimited saving.</p>
              <PlanCta href="/plan" className="ds-btn ds-btn--ghost-ink" freeLabel="Plan my room" paidLabel="Plan my room" />
              <ul className={css.perks}>
                {FREE_PERKS.map((perk, i) => (
                  <li key={i}>
                    <Check size={16} color="var(--ds-blue)" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </article>

            {/* PLUS */}
            <article className={`${css.plan} ${css.plus}`} data-reveal="" aria-labelledby="plan-plus">
              <div className={css.planTop}>
                <h2 id="plan-plus">
                  Plus<span className={css.plusMark}>+</span>
                </h2>
                <span className={css.tag}>One time</span>
              </div>
              <p className={css.priceRow}>
                <span className={css.price}>{usd(PLUS_PRICE_USD)}</span>
                <span className={css.wasStack}>
                  <s>
                    <span className="ds-sr">was </span>
                    {usd(PLUS_PRICE_WAS_USD)}
                  </s>
                  <span className={css.cadence}>once</span>
                </span>
              </p>
              <p className={css.pitch}>
                A one-time upgrade with {PLUS_INITIAL_CREDITS} plan credits. Recharge {RECHARGE_CREDITS} for{" "}
                {usd(RECHARGE_PRICE_USD)}.
              </p>
              <UpgradeButton
                type="plus"
                className="ds-btn ds-btn--yellow"
                ownedClassName={`ds-btn ${css.owned}`}
                noteClassName={css.noteDark}
              />
              <ul className={css.perks}>
                {PLUS_PERKS.map((perk) => (
                  <li key={perk.title}>
                    <Check size={16} color="var(--ds-yellow)" />
                    <span>{perk.title}</span>
                  </li>
                ))}
              </ul>
              <p className={css.planFoot}>
                Out of credits? A {usd(RECHARGE_PRICE_USD)} recharge adds {RECHARGE_CREDITS === 3 ? "three" : RECHARGE_CREDITS} more.
              </p>
            </article>

            {/* PRO */}
            <article id="pro" className={`${css.plan} ${css.pro}`} data-reveal="" aria-labelledby="plan-pro">
              <div className={css.planTop}>
                <h2 id="plan-pro">Pro</h2>
                <span className={css.tag}>{PRO_INITIAL_CREDITS} credits</span>
              </div>
              <p className={css.priceRow}>
                <span className={css.price}>{usd(PRO_PRICE_USD)}</span>
                <span className={css.wasStack}>
                  <s>
                    <span className="ds-sr">was </span>
                    {usd(PRO_PRICE_WAS_USD)}
                  </s>
                  <span className={css.cadence}>once</span>
                </span>
              </p>
              <p className={css.pitch}>
                Build in 3D, find your own vibe, and bring your ideas to life. Includes {PRO_INITIAL_CREDITS} plan
                credits and all Plus tools.
              </p>
              <UpgradeButton
                type="pro"
                className="ds-btn ds-btn--white"
                ownedClassName={`ds-btn ${css.owned}`}
                noteClassName={css.noteDark}
              />
              <ul className={css.perks}>
                {PRO_PERKS.map((perk) => (
                  <li key={perk.title}>
                    <Check size={16} color="#fff" />
                    <span>{perk.title}</span>
                  </li>
                ))}
              </ul>
              <p className={css.planFoot}>At zero credits, top up at {usd(FLEX_CREDIT_PRICE_USD)} per credit.</p>
            </article>
          </div>

          <div className={`ds-tape ${css.flex}`} data-reveal="">
            <div className={css.flexName}>
              <b>Flex</b>
              <span>Pay as you go</span>
            </div>
            <p>
              Just need another design? Buy extra generation credits for {usd(FLEX_CREDIT_PRICE_USD)} each. Plus
              recharge adds {RECHARGE_CREDITS} for {usd(RECHARGE_PRICE_USD)}.
            </p>
            <span className={css.flexPrice}>
              {usd(FLEX_CREDIT_PRICE_USD)}
              <small>/credit</small>
            </span>
            <Link href="/account/billing" className="ds-btn ds-btn--ink ds-btn--sm">
              Buy extra credits
            </Link>
          </div>

          <ul className={css.trust} aria-label="Good to know">
            <li>Secured by Stripe</li>
            <li>One-time payment, no subscription</li>
            <li>Real products, live Amazon links</li>
            <li>{SCHOOLS.length} colleges supported</li>
            <li>{ROOM_LAYOUTS_FLOOR.toLocaleString("en-US")}+ dorm room layouts</li>
          </ul>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="credits-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Plan credits, explained
          </p>
          <Headline
            id="credits-title"
            className="ds-h2"
            lines={[{ text: "One thing costs a credit." }, { text: "Everything else is free.", serif: true }]}
          />
          <div className={css.credits}>
            <div className={css.uses} data-reveal="">
              <span className={css.one} aria-hidden="true">
                1
              </span>
              <div>
                <p className={css.kicker}>Uses a credit</p>
                <p className={css.usesTitle}>Generating a new room plan</p>
                <p className={css.usesNote}>
                  Pro custom vibes include one free regeneration; further regenerations use one credit each.
                </p>
              </div>
            </div>
            <div className={css.never} data-reveal="">
              <p className={css.kicker}>Never uses a credit</p>
              <ul>
                {NEVER.map((n) => (
                  <li key={n} className="ds-chip">
                    {n}
                  </li>
                ))}
              </ul>
              <p className={css.neverNote}>
                Purchased credits don&apos;t expire. Your saved designs and paid tools stay available even when your
                balance reaches zero. Guests never spend their host&apos;s credits.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`ds-section ${css.compare}`} aria-labelledby="compare-title">
        <div className="ds-wrap">
          <h2 id="compare-title" className={css.compareTitle} data-reveal="">
            Side by side
          </h2>
          <div className={css.tableWrap} role="region" aria-labelledby="compare-title" tabIndex={0}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Free</th>
                  <th scope="col" data-plus="">
                    Plus
                  </th>
                  <th scope="col" data-pro="">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td>{cell(row.free, "Free")}</td>
                    <td data-plus="">{cell(row.plus, "Plus")}</td>
                    <td>{cell(row.pro, "Pro")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={css.details}>
            {[
              { name: "Everything in Free, plus", tier: "Plus", perks: PLUS_PERKS },
              { name: "Everything in Plus, plus", tier: "Pro", perks: PRO_PERKS },
            ].map((g) => (
              <div key={g.tier} data-reveal="">
                <p className={css.kicker}>
                  {g.tier} · {g.name}
                </p>
                <dl>
                  {g.perks.map((p) => (
                    <div key={p.title}>
                      <dt>{p.title}</dt>
                      <dd>{p.body}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {FAQS.length > 0 && (
        <section className={`ds-section ${css.faq}`} aria-labelledby="faq-title">
          <div className="ds-wrap">
            <div className={css.faqHead}>
              <Headline
                id="faq-title"
                className="ds-h2 ds-h2--inline"
                lines={[{ text: "Before you" }, { text: "pay.", serif: true }]}
              />
              <Link href="/faq" className={css.allQ}>
                All questions <ArrowRight size={16} />
              </Link>
            </div>
            <ul className={css.faqGrid}>
              {FAQS.map((f, i) => (
                <li key={f.q} className={css.faqCard} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </li>
              ))}
            </ul>

          </div>
        </section>
      )}

      <section className={css.whySection} aria-label="Why the planner is free">
        <div className="ds-wrap">
          <p className={css.why} data-reveal="">
              <b>Why is the planner free?</b> Some shopping links are affiliate links that pay us a small commission at
              no extra cost to you. That helps keep the planner free to try.{" "}
              <Link href="/about" className="ds-link">
                More about how it works
              </Link>
              .
            </p>
        </div>
      </section>

      <CtaBand lead="Your room" tail="is waiting." tone="blue">
        <PlanCta
          href="/plan"
          className="ds-btn ds-btn--yellow ds-btn--lg"
          freeLabel="Plan my room for free"
          paidLabel="Plan my room"
          icon={<ArrowRight size={20} />}
        />
      </CtaBand>
    </PageShell>
  );
}
