import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import PlannerSteps from "@/components/planner/PlannerSteps";

export const metadata: Metadata = {
  title: "Plan your dorm room",
  description:
    "Pick your school and room, choose a style, set a budget, and get a layout that fits your exact dorm.",
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Same floating island header as the rest of the site; the planner's
          step progress sits just below it. */}
      <SiteHeader />
      <PlannerSteps />
      {/* Width, horizontal padding, and bottom clearance are owned per page:
          steps 1 and 2 are narrow forms, the result page is a wide two-panel view. */}
      <main className="w-full pt-6 sm:pt-10">{children}</main>
    </div>
  );
}
