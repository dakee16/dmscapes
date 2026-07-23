import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";

// Structural draft reflecting Dormscape's actual data flows and business
// model as of this writing. Have a legal professional (or a service like
// Termly/iubenda) review this before treating it as final, binding legal
// text, especially before scaling to meaningful user volume.

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Dormscape's terms of service: what the free dorm planner does, what it doesn't guarantee, and how the Amazon affiliate links work.",
};

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

export default function TermsPage() {
  return (
    <div>
      <Nav />
      <main>
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 font-mono text-sm text-ink-soft">
            Last updated: July 23, 2026
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Dormscape is a free tool. These terms explain what that means: what you can
            expect from us, what we can&rsquo;t promise, and the rules for using the site.
            By using Dormscape, you agree to them.
          </p>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              What Dormscape is
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape helps you plan a dorm room before you move in. Pick your school
              and building, get real room dimensions where they&rsquo;re published, choose a
              style, set a budget, and get a shoppable list of products that fit. The
              planner itself is free to use. No account is required to build a room plan,
              and no purchase is required either.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              No warranty on prices, availability, or fit
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Product prices, availability, and shipping are set by the retailer
              (currently Amazon), not by Dormscape. Prices change, items go out of
              stock, and listings get updated on their end without notice to us. We do
              our best to keep product data current, but we can&rsquo;t guarantee that a
              price or listing you see on Dormscape matches what you&rsquo;ll see at
              checkout.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Room dimensions, furniture placements, and product suggestions are
              planning aids, not guarantees. Measure your actual space and check a
              product&rsquo;s real dimensions before you buy, especially for anything large
              or hard to return.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              The Amazon affiliate relationship
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape is a participant in the Amazon Associates program. Some links on
              this site are affiliate links. If you click through and buy something,
              Dormscape earns a small commission, at no extra cost to you. This is how
              the tool stays free. It doesn&rsquo;t change the price you pay, and it
              doesn&rsquo;t influence which products we choose to feature beyond wanting
              them to actually fit the room and budget you set.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              College and university data
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape is not affiliated with, endorsed by, or operated on behalf of any
              college or university listed on this site. Room dimensions and hall
              information come from publicly available housing data and are provided to
              help you plan, not as an official record. Always confirm your actual
              room&rsquo;s dimensions and furnishings with your school&rsquo;s housing office
              before buying anything you can&rsquo;t return.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Using Dormscape
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Use the site the way it&rsquo;s meant to be used: to plan a room, save a
              design, and shop for it if you want to. Don&rsquo;t scrape, automate, or
              resell the data behind it. Don&rsquo;t submit deliberately false information,
              like fake room dimensions or impersonating a school. Don&rsquo;t try to abuse
              the account or feedback systems. We reserve the right to suspend or
              terminate access for accounts that misuse the service.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Accounts
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Creating an account is optional and only needed if you want to save a
              design and come back to it later. You can request that your account and
              associated data be deleted at any time by emailing us. See the{" "}
              <Link href="/privacy" className={TEXT_LINK}>
                Privacy Policy
              </Link>{" "}
              for details on what we store and how deletion works.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Changes to these terms
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              We may update these terms as Dormscape changes. If we do, we&rsquo;ll update
              the date at the top of this page. Continuing to use the site after a
              change means you accept the update.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Questions
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
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
