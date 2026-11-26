import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/ds/PageShell";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import css from "@/components/account/reset.module.css";
import UnsubscribeForm from "./UnsubscribeForm";

// Where the unsubscribe link in a marketing email lands. Opening it changes
// nothing (mail scanners prefetch links); the button POSTs to /api/unsubscribe.
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { u, t } = await searchParams;
  const valid = verifyUnsubscribeToken(u, t);

  return (
    <PageShell>
      <div className={`ds-wrap ${css.wrap}`}>
        <div>
          <p className={css.eyebrow}>Email preferences</p>
          {valid ? (
            <UnsubscribeForm u={u as string} t={t as string} />
          ) : (
            <>
              <h1 className={css.title}>
                <b>This link</b>{" "}
                <i>didn&apos;t work.</i>
              </h1>
              <p className={css.lede}>
                Part of it may have been cut off. Turn off tips and updates in Account settings, or write to us
                and we&apos;ll do it for you.
              </p>
              <div className={css.actions}>
                <Link href="/account/settings#marketing-emails" className="ds-btn ds-btn--ink-yellow">
                  Account settings
                </Link>
                <Link href="/contact" className="ds-btn ds-btn--ghost-ink">
                  Contact us
                </Link>
              </div>
            </>
          )}
        </div>

        <div className={css.art} data-reveal-img="load">
          <Image
            src="/redesign/site-login-door-hanger.jpg"
            alt="A yellow dormscape door hanger on a brass knob: Planning in progress, knock later."
            fill
            quality={75}
            sizes="(min-width: 900px) 512px, 1px"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
          />
        </div>
      </div>
    </PageShell>
  );
}
