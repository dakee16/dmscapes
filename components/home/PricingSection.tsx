import { Fragment } from "react";
import Link from "next/link";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { PRICING } from "@/lib/home-data";
import { PlusPerk } from "@/components/hall-finder/Entry";
import H2 from "./H2";
import css from "./Home.module.css";

type Tier = (typeof PRICING)[keyof typeof PRICING];

/** 09 · Pricing. Every price and credit count comes from lib/plan.ts. */
export default function PricingSection() {
  const cards = [
    { tier: PRICING.free, cls: css.planFree, check: "var(--ds-blue)" },
    { tier: PRICING.plus, cls: css.planPlus, check: "var(--ds-pink)" },
    { tier: PRICING.pro, cls: css.planPro, check: "var(--ds-yellow)" },
  ];
  return (
    <section id="pricing" className={css.pricing} data-bg="#dce1f5" aria-labelledby="pricing-title">
      <div className="ds-wrap">
        <p className="ds-eyebrow" data-rv="">
          Pricing · one-time, no subscription
        </p>
        <H2 id="pricing-title" s="Start free." f="Upgrade once." />
        <p className={`ds-lede ${css.pricingLede}`} data-rv="">
          Saving your designs is always free.
        </p>
        <div className={css.priceGrid}>
          {cards.map(({ tier, cls, check }) => (
            <article key={tier.name} className={`${css.plan} ${cls}`} data-rv="row" aria-labelledby={`price-${tier.name}`}>
              {tier.name === "Pro" && <span className={css.sheen} aria-hidden="true" data-anim="" />}
              <div className={css.planTop}>
                <h3 id={`price-${tier.name}`}>{tier.name}</h3>
                <span className={css.ptag}>{tier.tag}</span>
              </div>
              <Price tier={tier} />
              <p className={css.pline}>{tier.line}</p>
              <ul className={css.perks}>
                {tier.perks.map((perk, i) => (
                  <Fragment key={perk}>
                    <li>
                      <Check color={check} size={18} className="ds-check" />
                      <span>{perk}</span>
                    </li>
                    {/* Hall Finder goes after the vibes (design-handoff/hall-finder 17-Mentions). */}
                    {tier.name === "Plus" && i === 2 && <PlusPerk link check={<Check color={check} size={18} className="ds-check" />} />}
                  </Fragment>
                ))}
              </ul>
              <div className={css.planCta}>
                {tier.name === "Free" ? (
                  <PlanCta className="ds-btn ds-btn--ink" freeLabel="Plan my room free" icon={<ArrowRight />} />
                ) : tier.name === "Plus" ? (
                  <Link href="/pricing" className="ds-btn ds-btn--pink">
                    Get Plus
                    <ArrowRight />
                  </Link>
                ) : (
                  <Link href="/pricing#pro" className="ds-btn ds-btn--yellow">
                    Get Pro
                    <ArrowRight />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
        <p className={css.faq} data-rv="">
          Questions about credits or what&apos;s included?{" "}
          <Link href="/faq" className="ds-link">
            Read the FAQ
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Price({ tier }: { tier: Tier }) {
  return (
    <div className={css.priceRow}>
      <span className={css.price}>{tier.price}</span>
      {"was" in tier && (
        <span className={css.was}>
          <span className="ds-sr">was </span>
          {tier.was}
        </span>
      )}
      <span className={css.once}>{tier.note}</span>
    </div>
  );
}
