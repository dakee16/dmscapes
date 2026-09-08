import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import PlannerSteps from "@/components/planner/PlannerSteps";
import PlannerTabs from "@/components/planner/PlannerTabs";

export const metadata: Metadata = {
  title: "Plan your dorm room",
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
        <PlannerTabs />
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
