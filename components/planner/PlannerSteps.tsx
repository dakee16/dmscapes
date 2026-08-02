"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/plan", label: "Room" },
  { href: "/plan/style", label: "Style" },
  { href: "/plan/result", label: "Design" },
] as const;

function currentStep(pathname: string): number {
  if (pathname.startsWith("/plan/result")) return 2;
  if (pathname.startsWith("/plan/style")) return 1;
  return 0;
}

/**
 * Planner progress indicator. It used to live in a separate full-width planner
 * header; now the shared SiteHeader renders on the planner flow like everywhere
 * else, and this sits just below it as a compact, centered pill on the grid, so
 * the header stays identical site-wide while the planner keeps its step affordance.
 */
export default function PlannerSteps() {
  const pathname = usePathname();
  const current = currentStep(pathname);

  return (
    <div className="mx-auto mt-3 flex w-full max-w-6xl justify-center px-4 sm:mt-5 sm:px-8">
      <ol
        className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper/70 px-3.5 py-1.5 shadow-sm backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-2"
        aria-label="Planner steps"
      >
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const inner = (
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-cobalt text-white"
                    : done
                      ? "bg-ink text-white"
                      : "border border-ink/20 text-ink-soft"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {/* On the tightest widths only the active step keeps its label
                  beside its number; the rest stay compact. */}
              <span
                className={`text-xs font-medium sm:text-sm ${
                  active ? "text-ink" : "hidden text-ink-soft sm:inline"
                }`}
              >
                {step.label}
              </span>
            </span>
          );
          return (
            <li key={step.href} className="flex items-center gap-1.5 sm:gap-3">
              {i > 0 && <span className="h-px w-3 bg-ink/15 sm:w-6" aria-hidden="true" />}
              {done ? (
                <Link
                  href={step.href}
                  className="rounded-md transition-opacity hover:opacity-70"
                  aria-label={`Back to step ${i + 1}: ${step.label}`}
                >
                  {inner}
                </Link>
              ) : (
                <span aria-current={active ? "step" : undefined}>{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
