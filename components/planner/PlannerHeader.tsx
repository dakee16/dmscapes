"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileMenu from "@/components/auth/ProfileMenu";

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

export default function PlannerHeader() {
  const pathname = usePathname();
  const current = currentStep(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="Dormscape home">
          <span className="font-display text-base font-bold tracking-tight sm:text-lg">
            dorm<span className="text-amber">scape</span>
          </span>
        </Link>

        <ol className="flex items-center gap-1.5 sm:gap-3" aria-label="Planner steps">
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
                {/* At 375px only the active step's label fits alongside the
                    wordmark and profile icon; the rest keep their number. */}
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

        <ProfileMenu />
      </div>
    </header>
  );
}
