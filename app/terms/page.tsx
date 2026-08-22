import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";

// Structural draft reflecting Dormscape's actual data flows and business
// model as of this writing. Have a legal professional (or a service like
// Termly/iubenda) review this before treating it as final, binding legal
// text, especially before scaling to meaningful user volume.
//
// PRESENTATION NOTE: the TOC, section numbers, and "short version" summary box
// are navigation/structure only. The legal paragraph text below is unchanged.

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Dormscape's terms of service: what the free dorm planner does, what it doesn't guarantee, and how the Amazon affiliate links work.",
};

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

const H2 = "font-display text-2xl font-bold tracking-tight";
const P = "mt-3 text-base leading-relaxed text-ink-soft";

// Section order + titles, used for the table of contents and the numbered
// headings so the two never drift out of sync.
const SECTIONS = [
  { id: "what-dormscape-is", title: "What Dormscape is" },
  { id: "no-warranty", title: "No warranty on prices, availability, or fit" },
  { id: "affiliate", title: "The Amazon affiliate relationship" },
  { id: "defective-products", title: "Defective or faulty products" },
  { id: "paid-plans", title: "Paid plans and refunds" },
  { id: "college-data", title: "College and university data" },
  { id: "using-dormscape", title: "Using Dormscape" },
  { id: "accounts", title: "Accounts" },
  { id: "saving-your-design", title: "Saving your design" },
  { id: "changes", title: "Changes to these terms" },
  { id: "questions", title: "Questions" },
] as const;

// Plain-language recap. Accurate restatement of the sections below; it sits
// alongside the full text and does not replace it.
const SUMMARY = [
  "Dormscape is a free planning tool. No account or purchase is needed to plan a room.",
  "We can't guarantee prices, availability, or that a product fits. Measure and check before you buy.",
  "Some links are Amazon affiliate links; we may earn a small commission at no extra cost to you, which keeps the tool free.",
  "We don't sell or ship products. Returns, refunds, and faulty items are handled by Amazon, not us.",
  "Paid Dormscape features (Plus, Flex credits, Pro) are final and non-refundable; we don't entertain refunds or payment disputes on them.",
  "We're not affiliated with any college; dorm data comes from public sources, not an official record.",
  "Accounts are optional (only to save designs), and you can ask us to delete yours anytime.",
  "Unsaved designs can be lost, so save before you leave the page.",
];

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className={H2}>
      <span className="mr-2 font-mono text-lg font-semibold text-cobalt">{n}.</span>
      {title}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[20rem]" />
      <main>
        <div className="mx-auto max-w-[50rem] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          {/* Prominent "last updated" badge. */}
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
            Last updated: July 23, 2026
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Dormscape is a free tool. These terms explain what that means: what you can
            expect from us, what we can&rsquo;t promise, and the rules for using the site.
            By using Dormscape, you agree to them.
          </p>

          {/* Plain-language summary box (sits alongside the full text). */}
          <aside className="mt-8 rounded-2xl border border-cobalt/20 bg-cobalt/[0.04] p-5 sm:p-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt">
              The short version
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              A plain-language recap, not a substitute for the full terms below.
            </p>
            <ul className="mt-4 space-y-2.5">
              {SUMMARY.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-sm leading-snug text-ink">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </aside>

          {/* Table of contents. */}
          <nav aria-label="Contents" className="mt-8 rounded-2xl border border-ink/10 bg-card p-5 sm:p-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Contents
            </p>
            <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="group flex gap-2 text-sm text-ink-soft transition-colors hover:text-cobalt">
                    <span className="font-mono text-ink-soft/70 group-hover:text-cobalt">{i + 1}.</span>
                    <span className="underline-offset-2 group-hover:underline">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* ---- Full legal text (verbatim) ---- */}

          <section id="what-dormscape-is" className="mt-14 scroll-mt-24">
            <SectionHeading n={1} title="What Dormscape is" />
            <p className={P}>
              Dormscape helps you plan a dorm room before you move in. Pick your school
              and building, get real room dimensions where they&rsquo;re published, choose a
              style, set a budget, and get a shoppable list of products that fit. The
              planner itself is free to use. No account is required to build a room plan,
              and no purchase is required either.
            </p>
          </section>

          <section id="no-warranty" className="mt-14 scroll-mt-24">
            <SectionHeading n={2} title="No warranty on prices, availability, or fit" />
            <p className={P}>
              Product prices, availability, and shipping are set by the retailer
              (currently Amazon), not by Dormscape. Prices change, items go out of
              stock, and listings get updated on their end without notice to us. We do
              our best to keep product data current, but we can&rsquo;t guarantee that a
              price or listing you see on Dormscape matches what you&rsquo;ll see at
              checkout.
            </p>
            <p className={P}>
              Room dimensions, furniture placements, and product suggestions are
              planning aids, not guarantees. Measure your actual space and check a
              product&rsquo;s real dimensions before you buy, especially for anything large
              or hard to return.
            </p>
          </section>

          <section id="affiliate" className="mt-14 scroll-mt-24">
            <SectionHeading n={3} title="The Amazon affiliate relationship" />
            <p className={P}>
              Dormscape is a participant in the Amazon Associates program. Some links on
              this site are affiliate links. If you click through and buy something,
              Dormscape earns a small commission, at no extra cost to you. This is how
              the tool stays free. It doesn&rsquo;t change the price you pay, and it
              doesn&rsquo;t influence which products we choose to feature beyond wanting
              them to actually fit the room and budget you set.
            </p>
          </section>

          <section id="defective-products" className="mt-14 scroll-mt-24">
            <SectionHeading n={4} title="Defective or faulty products" />
            <p className={P}>
              Dormscape doesn&rsquo;t sell, ship, stock, or fulfill any of the products you
              see here. Every item is sold by the retailer (currently Amazon), and buying
              it happens entirely on their site, under their terms. We&rsquo;re not
              responsible for products that arrive defective, damaged, faulty, late, or
              not as described, and we can&rsquo;t process returns, refunds, replacements,
              or warranty claims.
            </p>
            <p className={P}>
              If something you bought through a link on Dormscape has a problem, resolve it
              directly with Amazon (or the relevant retailer) through their own return and
              refund process, which is what governs that purchase. Reaching out to us about
              a damaged or faulty item won&rsquo;t be able to fix it, because the order was
              never ours to fulfill.
            </p>
          </section>

          <section id="paid-plans" className="mt-14 scroll-mt-24">
            <SectionHeading n={5} title="Paid plans and refunds" />
            <p className={P}>
              Some Dormscape features are paid: the Plus one-time unlock,
              &agrave;-la-carte Flex credits, and the Pro plan. All payments for these
              are final and non-refundable. When you buy, you&rsquo;re paying for access
              to the feature, not for any particular result or outcome.
            </p>
            <p className={P}>
              If a paid feature doesn&rsquo;t work out the way you hoped &mdash; for
              example, a generated room, product match, or layout isn&rsquo;t what you
              wanted &mdash; that is not grounds for a refund. We don&rsquo;t issue
              refunds, partial refunds, or credit-backs, and we don&rsquo;t entertain
              payment disputes or chargebacks, for a paid feature that was delivered to
              your account. By purchasing, you agree not to initiate a chargeback or
              dispute on that basis. Payments are processed by Stripe under their terms.
            </p>
          </section>

          <section id="college-data" className="mt-14 scroll-mt-24">
            <SectionHeading n={6} title="College and university data" />
            <p className={P}>
              Dormscape is not affiliated with, endorsed by, or operated on behalf of any
              college or university listed on this site. Room dimensions and hall
              information come from publicly available housing data and are provided to
              help you plan, not as an official record. Always confirm your actual
              room&rsquo;s dimensions and furnishings with your school&rsquo;s housing office
              before buying anything you can&rsquo;t return.
            </p>
          </section>

          <section id="using-dormscape" className="mt-14 scroll-mt-24">
            <SectionHeading n={7} title="Using Dormscape" />
            <p className={P}>
              Use the site the way it&rsquo;s meant to be used: to plan a room, save a
              design, and shop for it if you want to. Don&rsquo;t scrape, automate, or
              resell the data behind it. Don&rsquo;t submit deliberately false information,
              like fake room dimensions or impersonating a school. Don&rsquo;t try to abuse
              the account or feedback systems. We reserve the right to suspend or
              terminate access for accounts that misuse the service.
            </p>
          </section>

          <section id="accounts" className="mt-14 scroll-mt-24">
            <SectionHeading n={8} title="Accounts" />
            <p className={P}>
              Creating an account is optional and only needed if you want to save a
              design and come back to it later. You can request that your account and
              associated data be deleted at any time by emailing us. See the{" "}
              <Link href="/privacy" className={TEXT_LINK}>
                Privacy Policy
              </Link>{" "}
              for details on what we store and how deletion works.
            </p>
          </section>

          <section id="saving-your-design" className="mt-14 scroll-mt-24">
            <SectionHeading n={9} title="Saving your design" />
            <p className={P}>
              Dormscape does not save your room design automatically. A design you
              generate lives only in your browser until you choose to save it to
              an account. If you leave, refresh, or close the page before saving,
              that design is lost, and we can&rsquo;t recover it for you. Saving is
              free and unlimited once you have an account, so when a design is
              ready, save it before you navigate away. We&rsquo;re not responsible
              for unsaved designs that are lost this way.
            </p>
          </section>

          <section id="changes" className="mt-14 scroll-mt-24">
            <SectionHeading n={10} title="Changes to these terms" />
            <p className={P}>
              We may update these terms as Dormscape changes. If we do, we&rsquo;ll update
              the date at the top of this page. Continuing to use the site after a
              change means you accept the update.
            </p>
          </section>

          <section id="questions" className="mt-14 scroll-mt-24">
            <SectionHeading n={11} title="Questions" />
            <p className={P}>
              Questions about these terms? Email{" "}
              <a href="mailto:info@dormscape.us" className={TEXT_LINK}>
                info@dormscape.us
              </a>
              .
            </p>
          </section>

          <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/10 pt-8 text-sm">
            <Link href="/privacy" className={TEXT_LINK}>
              Privacy Policy
            </Link>
            <Link href="/cookies" className={TEXT_LINK}>
              Cookie Policy
            </Link>
            <Link href="/" className={TEXT_LINK}>
              Back to Dormscape
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
