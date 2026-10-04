import Link from "next/link";
import Headline from "@/components/ds/Headline";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { PRICING } from "@/lib/home-data";
import css from "./Home.module.css";

type Tier = (typeof PRICING)[keyof typeof PRICING];

function Price({ tier }: { tier: Tier }) {
  return (
    <div className={css.priceRow}>
      <span className={css.price}>{tier.price}</span>
      {"was" in tier && (
        <span className={css.was}>
          <span className="ds-sr">was </span>
          {tier.was}
          <span className={css.strike} data-draw="" aria-hidden="true" />
        </span>
      )}
      <span className={css.once}>{tier.note}</span>
    </div>
  );
}

/** 09 · Pricing. Every price and credit count comes from lib/plan.ts. */
export default function PricingSection() {
  const cards = [
    { tier: PRICING.free, cls: css.planFree, check: "var(--ds-blue)" },
    { tier: PRICING.plus, cls: css.planPlus, check: "var(--ds-pink)" },
    { tier: PRICING.pro, cls: css.planPro, check: "var(--ds-yellow)" },
  ];
  return (
    <section id="pricing" className={`${css.section} ${css.pricing}`} aria-labelledby="pricing-title">
      <div className={css.inner}>
        <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
          Pricing · one-time, no subscription
        </p>
        <Headline
          id="pricing-title"
          className={css.h2g}
          lines={[
            { text: "Start free.", className: css.s },
            { text: "Upgrade once.", serif: true, className: css.f },
          ]}
        />
        <p className="ds-lede" style={{ marginTop: 16 }} data-reveal="">
          Saving your designs is always free.
        </p>

        <div className={css.priceGrid} data-stagger="">
          {cards.map(({ tier, cls, check }) => (
            <article key={tier.name} className={`${css.plan3} ${cls}`} data-reveal="" aria-labelledby={`price-${tier.name}`}>
              {tier.name === "Pro" && <span className={css.sheen} aria-hidden="true" />}
              <div className={css.planTop}>
                <h3 id={`price-${tier.name}`}>{tier.name}</h3>
                <span className={css.planTag}>{tier.tag}</span>
              </div>
              <Price tier={tier} />
              <p className={css.planLine}>{tier.line}</p>
              <ul className={css.perks}>
                {tier.perks.map((perk) => (
                  <li key={perk}>
                    <Check color={check} size={18} className="ds-check" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <div className={css.planCta}>
                {tier.name === "Free" ? (
                  <PlanCta
                    className="ds-btn ds-btn--ink"
                    freeLabel="Plan my room free"
                    icon={<ArrowRight />}
                  />
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
        <p className={css.faqLine} data-reveal="">
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
