import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import { Check } from "@/components/ds/Icons";
import ThankYouView from "./ThankYouView";
import css from "@/components/report/ThankYou.module.css";

export const metadata: Metadata = {
  description: "Your dorm room is handled. Thanks for planning with Dormscape.",
  robots: { index: false }, // a post-purchase moment, not a landing page
};

export default function ThankYouPage() {
  return (
    <PageShell navOverlay>
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        className={css.hero}
        lines={[
          { text: "Thank you for using ", riso: true },
          { text: "Dormscape.", serif: true },
        ]}
        lede={
          <p>
            Your room has a plan. Keep your layout handy while you finish shopping
            and get ready for move-in.
          </p>
        }
        visual={
          <div className={css.badgeWrap} aria-hidden="true" data-pop="">
            <span className={css.badge}>
              <Check size={64} strokeWidth={2.6} />
            </span>
          </div>
        }
      />
      <section className="ds-section ds-section--tight">
        <div className="ds-wrap">
          <ThankYouView />
        </div>
      </section>
    </PageShell>
  );
}
