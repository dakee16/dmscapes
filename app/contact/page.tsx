import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import { ArrowRight } from "@/components/ds/Icons";
import PostcardForm from "@/components/contact/PostcardForm";
import css from "@/components/contact/Contact.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Questions, feedback, a school we should add, or a bug to report? Send the Dormscape team a message.",
  path: "/contact",
});

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
            <a href="mailto:info@dormscape.us">info@dormscape.us</a> ·{" "}
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
    </PageShell>
  );
}
