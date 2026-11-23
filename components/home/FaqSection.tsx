import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import { POSTS } from "@/content/blog";
import H2 from "./H2";
import css from "./Home.module.css";

// Six questions from /faq for someone choosing a plan. The answers are read from the posts that
// own them, so the homepage and /faq can't disagree; a renamed question fails the build here.
const PICKS: [slug: string, q: string][] = [
  ["is-dormscape-plus-worth-it", "Is the dormscape planner still free?"],
  ["is-dormscape-plus-worth-it", "What uses a dormscape plan credit?"],
  ["is-dormscape-plus-worth-it", "What is the difference between Plus and Pro?"],
  ["design-your-own-dorm-room", "Can I plan a dorm room that isn't in dormscape's database?"],
  ["plan-a-dorm-room-with-roommates", "Do all roommates need to purchase Pro?"],
  ["find-the-dorm-closest-to-your-classes", "Is Hall Finder free?"],
];
const ITEMS = PICKS.map(([slug, q]) => {
  const faq = POSTS.find((p) => p.slug === slug)?.faqs?.find((f) => f.q === q);
  if (!faq) throw new Error(`FaqSection: "${q}" is no longer in content/blog (${slug}).`);
  return faq;
});
const TOTAL = POSTS.reduce((n, p) => n + (p.faqs?.length ?? 0), 0);

/** Under the plans: the questions people ask before choosing one. One opens at a time (details name). */
export default function FaqSection() {
  return (
    <section id="faq" className={css.faqs} data-bg="#dce1f5" aria-labelledby="faq-title">
      <div className={`ds-wrap ${css.faqGrid}`}>
        <div>
          <p className="ds-eyebrow">FAQ</p>
          <H2 id="faq-title" s="Questions," f="answered." />
          <p className={`ds-lede ${css.faqLede}`}>The short answers to what people ask before they pick a plan.</p>
          <Link href="/faq" className={css.faqAll}>
            See all {TOTAL} questions
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className={css.faqList}>
          {ITEMS.map((f) => (
            <details key={f.q} name="home-faq" className={css.faqItem} data-rv="row">
              <summary>
                <h3>{f.q}</h3>
                <span className={css.faqIcon} aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
