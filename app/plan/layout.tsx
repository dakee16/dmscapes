import type { Metadata } from "next";
import PlannerHeader from "@/components/planner/PlannerHeader";

export const metadata: Metadata = {
  title: "Plan your dorm room — Dormscape",
  description:
    "Pick your school and room, choose a style, set a budget — get a layout that fits your exact dorm.",
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <PlannerHeader />
      {/* Graph-paper wash behind the top of every step */}
      <div
        className="grid-paper grid-paper-fade pointer-events-none absolute inset-x-0 top-16 -z-10 h-80"
        aria-hidden="true"
      />
      {/* Width, horizontal padding, and bottom clearance are owned per-page:
          steps 1–2 are narrow forms, the result page is a wide two-panel view. */}
      <main className="w-full pt-8 sm:pt-12">{children}</main>
    </div>
  );
}
