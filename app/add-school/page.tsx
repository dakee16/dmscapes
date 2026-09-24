import Footer from "@/components/Footer";
import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import AddSchoolForm from "@/components/site/AddSchoolForm";

export const metadata: Metadata = {
  description:
    "Add your college to the Dormscape dorm room planner. Tell us the building and room size and we'll add it.",
};

export default function AddSchoolPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[28rem]" />
      <main id="page-content" tabIndex={-1} className="dm-page min-h-[80vh]">
        <div className="dm-contact-layout">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Every campus, eventually
          </p>
          <h1 className="dm-page-title mt-3 font-display text-4xl font-extrabold tracking-tight">
            Add <span className="hl">your school.</span>
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Only your college name and email are required.
          </p>
          <div className="mt-8 rounded-xl border border-ink/10 bg-card p-6 shadow-sm">
            <AddSchoolForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
