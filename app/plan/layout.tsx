import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import PlannerSteps from "@/components/planner/PlannerSteps";

export const metadata: Metadata = {
  description:
    "Pick your school and room, choose a style, set a budget, and get a layout that fits your exact dorm.",
};

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dm-plan-shell relative min-h-screen">
      <SiteHeader />
      <div className="dm-plan-topbar">
        <PlannerSteps />
      </div>
      <main
        id="page-content"
        tabIndex={-1}
        className="dm-page w-full pt-6 sm:pt-10"
      >
        {children}
      </main>
    </div>
  );
}
