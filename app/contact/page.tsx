import type { Metadata } from "next";
import { CONTACT_EMAIL, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import PostcardForm from "@/components/contact/PostcardForm";
import css from "@/components/contact/Contact.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Questions, feedback, a school we should add, or a bug to report? Send the Dormscape team a message.",
  path: "/contact",
});

// Where each kind of message goes. The wording is the site's own (report, methodology,
// add-school and privacy pages), so these stay true as those pages do.
const WAYS = [
  {
    title: "Email us",
    text: `Questions, feedback or anything the form doesn't cover. Write to ${CONTACT_EMAIL} and we'll get back to you at that address.`,
    cta: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    title: "Report a problem",
    text: "A broken tool, an incorrect product, or something that made you uncomfortable. No account needed, and your report is private.",
    cta: "Report a problem",
    href: "/report",
  },
  {
    title: "Correct a room size",
    text: "Corrections are welcome and they are the fastest way this data gets better. Tell us the school, the building and the room type, and ideally where the university publishes the real number.",
    cta: "How corrections work",
    href: "/methodology#corrections",
  },
  {
    title: "Add your school",
    text: "Just the college name and your email are required. Know your room's size? Even better: measurements help us support your dorm faster.",
    cta: "Add your school",
    href: "/add-school",
  },
  {
    title: "Your data and privacy",
    text: `To access, correct or delete your personal information, contact ${CONTACT_EMAIL}. You can also permanently delete your account yourself in Account settings.`,
    cta: "Read the privacy policy",
    href: "/privacy",
  },
  {
    title: "Quick answers",
    text: "Room measurements, budgets, styles and Pro 3D room building: the questions people ask most, answered in one place.",
    cta: "Read the FAQ",
    href: "/faq",
  },
];

const QUICK = [
  { label: "Report a correction", href: "/methodology#corrections" },
  { label: "Add your school", href: "/add-school" },
  { label: "Read the FAQ first", href: "/faq" },
];

export default function ContactPage() {
  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-warm)"
        size="md"
        className={css.hero}
        eyebrow="Get in touch"
        lines={[
          { text: "Contact", riso: true },
          { text: "us.", serif: true },
        ]}
        lede={
          <p>
            Questions, feedback, a school we should add, or something not working right. Send it over and we&apos;ll get
            back to you at the email you leave.
          </p>
        }
        visual={<PostcardForm />}
      >
        <div className={css.aside}>
          <ul className={css.quick}>
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link href={q.href}>
                  {q.label}
                  <ArrowRight />
                </Link>
              </li>
            ))}
          </ul>
          <p className={css.reach}>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{" "}
            <a href="https://tiktok.com/@dorm.scape" target="_blank" rel="noopener noreferrer">
              TikTok<span className="ds-sr"> (opens in a new tab)</span>
            </a>{" "}
            ·{" "}
            <a href="https://www.instagram.com/dorm.scape" target="_blank" rel="noopener noreferrer">
              Instagram<span className="ds-sr"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </PageHero>
      <section className={`ds-section ${css.ways}`} aria-labelledby="ways-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" data-reveal="">
            Before you write
          </p>
          <Headline
            id="ways-title"
            className={`ds-h2 ${css.waysTitle}`}
            lines={[
              { text: "Other ways", riso: true },
              { text: "to reach us.", serif: true },
            ]}
          />
          <ul className={css.wayGrid}>
            {WAYS.map((way, i) => (
              <li key={way.title} className={css.way} data-reveal="" style={{ "--i": i % 3 } as React.CSSProperties}>
                <h3>{way.title}</h3>
                <p>{way.text}</p>
                {way.href.startsWith("/") ? (
                  <Link href={way.href} className={css.wayLink}>
                    {way.cta}
                    <ArrowRight />
                  </Link>
                ) : (
                  <a href={way.href} className={css.wayLink}>
                    {way.cta}
                    <ArrowRight />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
