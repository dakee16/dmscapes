import type { Metadata } from "next";
import PlannerShell from "@/components/plan-steps/PlannerShell";

export const metadata: Metadata = {
  description:
    "Pick your school and room, choose a style, set a budget, and get a layout that fits your exact dorm.",
};

/**
 * School → Room → Vibe → Budget get the planner app bar and <main>
 * (PlannerShell). /plan/result and /plan/draw/** render their own chrome,
 * so the shell passes them through bare.
 */
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <PlannerShell>{children}</PlannerShell>;
}
