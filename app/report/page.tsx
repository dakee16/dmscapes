import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/Footer";
import ReportForm from "@/components/site/ReportForm";
import { reportPath } from "@/lib/reports";
import s from "@/components/site/Support.module.css";

export const metadata: Metadata = { description: "Report a bug, shopping issue or safety concern to the Dormscape team.", robots: { index: false } };
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
  return <><SiteHeader /><main id="page-content" tabIndex={-1} className={s.page}><div className={s.layout}>
    <div className={s.intro}><p className={s.eyebrow}>A better room starts with listening.</p>
      <h1>Something<br /><em>not right?</em></h1>
      <p>A broken tool, an incorrect product, or something that made you uncomfortable. Tell us here.</p>
      <div className={s.note}>No account needed. Your report is private.<br />Prefer email? <a href="mailto:info@dormscape.us">info@dormscape.us</a></div>
    </div><ReportForm from={reportPath(params.from)} />
  </div></main><Footer /></>;
}
