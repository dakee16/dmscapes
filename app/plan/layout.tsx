import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PlannerShell from "@/components/plan-steps/PlannerShell";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Plan Your Dorm Room",
    description:
      "Pick your school and room, choose a style, set a budget, and get a layout that fits your exact dorm.",
    path: "/plan",
  }),
  // A layout's string title would stop the root template reaching the pages
  // below it, so this one restates it.
  title: { absolute: "Plan Your Dorm Room | dormscape", template: "%s | dormscape" },
};

/**
 * School → Room → Vibe → Budget get the planner app bar and <main>
 * (PlannerShell). /plan/result and /plan/draw/** render their own chrome,
 * so the shell passes them through bare.
 */
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <PlannerShell>{children}</PlannerShell>;
}
