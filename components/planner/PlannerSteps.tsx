"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "@/components/ds/Icons";
import css from "@/components/plan-steps/Shell.module.css";

/** School and room share step 01; the Pro vibe field belongs to step 02. */
export const PLANNER_STEPS = [
  { href: "/plan", label: "Room" },
  { href: "/plan/style", label: "Vibe" },
  { href: "/plan/budget", label: "Budget" },
] as const;

export function currentStep(pathname: string): number {
  if (pathname.startsWith("/plan/budget")) return 2;
  if (pathname.startsWith("/plan/style") || pathname.startsWith("/plan/create-vibe")) return 1;
  return 0;
}

/**
 * The planner's progress, drawn as a strip of measuring tape. Finished steps
 * are links back; the current step is the ink tag; later steps wait.
 */
export default function PlannerSteps() {
  const pathname = usePathname();
  const current = currentStep(pathname);

  return (
    <nav aria-label="Planner steps" className={css.stepsNav}>
      <ol className={css.tape}>
        {PLANNER_STEPS.map((step, i) => {
          const n = String(i + 1).padStart(2, "0");
          const label = (
            <>
              <span className={css.stepNum}>{n} </span>
              {step.label}
            </>
          );
          if (i < current) {
            return (
              <li key={step.href} className={css.step} data-state="done">
                <Link href={step.href} className={css.stepLink} aria-label={`Step ${i + 1}, ${step.label}: done. Go back`}>
                  <Check size={13} strokeWidth={3.2} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          }
          if (i === current) {
            return (
              <li key={step.href} className={css.step} data-state="current" aria-current="step">
                <span className={css.stepTag}>{label}</span>
              </li>
            );
          }
          return (
            <li key={step.href} className={css.step} data-state="todo">
              <span className={css.stepTodo}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
