import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import GiftForm from "@/components/gift/GiftForm";
import { pageMetadata } from "@/lib/seo";
import { PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_PRICE_USD } from "@/lib/plan";
import css from "@/components/gift/Gift.module.css";

const usd = (n: number) => `$${n.toFixed(2)}`;

export const metadata: Metadata = pageMetadata({
  title: "Give dormscape as a Gift",
  description: `Give dormscape Plus (${usd(PLUS_PRICE_USD)}) or Pro (${usd(PRO_PRICE_USD)}) to someone heading to college. They get an email with a code that never expires. One-time payment.`,
  path: "/gift",
});

const STEPS = [
  { title: "Pick Plus or Pro", text: "Add their email, your name if you like, and a short note." },
  { title: "Pay once", text: "Checkout is on Stripe. The receipt comes to you; the gift goes to them by email." },
  { title: "They redeem it", text: "On their own free account, whenever they're ready. The code never expires." },
];

export default function GiftPage() {
  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-sky)"
        size="md"
        className={css.hero}
        eyebrow="Gift a plan · one-time, no subscription"
        lines={[
          { text: "Give a room", riso: true },
          { text: "a head start.", serif: true },
        ]}
        lede={
          <p>
            Send Plus or Pro to someone heading to college. They get an email with a code to redeem on their own account,
            whenever they&rsquo;re ready.
          </p>
        }
        visual={<GiftForm />}
      >
        <p className={css.aside}>
          Got a gift?{" "}
          <Link href="/gift/redeem" className="ds-link">
            Redeem your code
          </Link>
          .
        </p>
      </PageHero>

      <section className={`ds-section--tight ${css.how}`} aria-labelledby="how-title">
        <div className="ds-wrap">
          <Headline id="how-title" className="ds-h2 ds-h2--inline" lines={[{ text: "How gifting" }, { text: "works.", serif: true }]} />
          <ol className={css.steps}>
            {STEPS.map((s) => (
              <li key={s.title} data-reveal="">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <ul className={css.facts} aria-label="Good to know">
            <li>No expiry</li>
            <li>Each code works once</li>
            <li>Already on Pro? A Plus gift adds its {PLUS_INITIAL_CREDITS} plan credits</li>
            <li>A refunded gift&rsquo;s code stops working</li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
