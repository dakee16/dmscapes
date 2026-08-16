import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import AddSchoolForm from "@/components/site/AddSchoolForm";

export const metadata: Metadata = {
  title: "Add My School",
  description:
    "Add your college to the Dormscape dorm room planner. Tell us the building and room size and we'll add it.",
};

export default function AddSchoolPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[28rem]" />
      <main className="min-h-[80vh]">
        <div className="mx-auto max-w-xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Every campus, eventually
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Add <span className="hl">your school.</span>
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Know your room&rsquo;s size? Even better. Measurements help us support
            your dorm faster. Just the college name and your email are required.
          </p>
          <div className="mt-8 rounded-xl border border-ink/10 bg-card p-6 shadow-sm">
            <AddSchoolForm />
          </div>
        </div>
      </main>
    </div>
  );
}
