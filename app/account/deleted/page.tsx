import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import { ArrowUpRight, Check } from "@/components/ds/Icons";
import s from "@/components/account/account.module.css";

export default function AccountDeletedPage() {
  return (
    <PageShell>
      <div className={`ds-wrap ${s.done}`}>
        <div className={s.doneCard}>
          <span className={s.doneSeal} aria-hidden="true" data-pop="load">
            <Check size={40} strokeWidth={3} />
          </span>
          <h1 className={s.doneTitle} data-reveal="load">Account deleted.</h1>
          <p data-reveal="load" style={{ "--i": 1 } as React.CSSProperties}>
            You have been signed out. Your account and the rooms you owned have been removed.
          </p>
          <p data-reveal="load" style={{ "--i": 2 } as React.CSSProperties}>
            Remember to clear Dormscape drafts on any other devices you use.
          </p>
          <Link href="/" className="ds-btn ds-btn--ink-yellow" data-reveal="load" style={{ "--i": 3 } as React.CSSProperties}>
            Back to Dormscape <ArrowUpRight />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
