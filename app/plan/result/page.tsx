import type { Metadata } from "next";
import PlanResult from "@/components/planner/PlanResult";

// A personal result screen: not a landing page.
// noindex, and no canonical inherited from /plan: the two would contradict each other.
export const metadata: Metadata = { title: "Your Room Plan", robots: { index: false, follow: true }, alternates: { canonical: null } };

// The planner studio is a full-screen app: it renders its own app bar and
// <main id="page-content"> (the /plan layout leaves this route bare).
export default function ResultPage() {
  return <PlanResult shell />;
}
