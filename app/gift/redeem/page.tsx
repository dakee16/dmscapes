import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import RedeemForm from "@/components/gift/RedeemForm";
import { pageMetadata } from "@/lib/seo";
import css from "@/components/gift/Gift.module.css";

// A utility page reached from the gift email, so it stays out of search.
export const metadata: Metadata = pageMetadata({
  title: "Redeem a Gift",
  description: "Redeem a dormscape gift code: the plan and its plan credits go straight to your account. Gift codes never expire.",
  path: "/gift/redeem",
  noIndex: true,
});

export default function RedeemGiftPage() {
  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-paper)"
        size="md"
        className={css.hero}
        eyebrow="Got a gift? · no expiry"
        lines={[
          { text: "Unwrap", riso: true },
          { text: "your room.", serif: true },
        ]}
        lede={
          <p>
            Enter the code from your gift email. Redeeming adds the plan and its plan credits to your dormscape account, and
            gift codes never expire.
          </p>
        }
        visual={<RedeemForm />}
      >
        <p className={css.aside}>
          Want to send one?{" "}
          <Link href="/gift" className="ds-link">
            Give dormscape as a gift
          </Link>
          .
        </p>
      </PageHero>
    </PageShell>
  );
}
