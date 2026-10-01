import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import ReportForm from "@/components/site/ReportForm";
import { reportPath } from "@/lib/reports";
import css from "@/components/report/Report.module.css";

export const metadata: Metadata = { description: "Report a bug, shopping issue or safety concern to the Dormscape team.", robots: { index: false } };
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
  return (
    <PageShell navOverlay>
      <PageHero
        size="md"
        bg="var(--ds-rose)"
        className={css.hero}
        eyebrow="A better room starts with listening."
        lines={[
          { text: "Something ", riso: true },
          { text: "not right?", serif: true },
        ]}
        lede={<p>A broken tool, an incorrect product, or something that made you uncomfortable. Tell us here.</p>}
      />
      <section className="ds-section ds-section--tight" aria-label="Report a problem">
        <div className={`ds-wrap ${css.layout}`}>
          <aside className={css.note} data-reveal="">
            <div className={css.indexCard}>
              <p className={css.noteLabel}>Before you start</p>
              <p className={css.noteText}>
                No account needed. Your report is private.
                <br />
                Prefer email? <a href="mailto:info@dormscape.us">info@dormscape.us</a>
              </p>
            </div>
          </aside>
          <div className={`ds-card ${css.card}`} data-reveal="">
            <ReportForm from={reportPath(params.from)} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
