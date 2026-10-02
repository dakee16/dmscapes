import PlanResult from "@/components/planner/PlanResult";

// The planner studio is a full-screen app: it renders its own app bar and
// <main id="page-content"> (the /plan layout leaves this route bare).
export default function ResultPage() {
  return <PlanResult shell />;
}
