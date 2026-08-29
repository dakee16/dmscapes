"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Plan | Draw switcher, shown just under the 1-2-3 progress steps on Step 1,
 * Step 2, and the Draw landing. "Plan" is the normal school-search flow; "Draw"
 * is the hand-drawn-room path. Hidden on every other planner sub-page.
 */
export default function PlannerTabs() {
  const pathname = usePathname();
  const onDraw = pathname.startsWith("/plan/draw");
  const onPlan =
    pathname === "/plan" ||
    pathname.startsWith("/plan/style") ||
    pathname.startsWith("/plan/create-vibe");
  if (!onDraw && !onPlan) return null;

  const tabs = [
    { href: "/plan", label: "Plan", active: onPlan, isNew: false },
    { href: "/plan/draw", label: "Draw", active: onDraw, isNew: true },
  ];

  return (
    <div className="mx-auto mt-2.5 flex w-full max-w-6xl justify-center px-4 sm:mt-3 sm:px-8">
      <div className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-paper/70 p-1 shadow-sm backdrop-blur-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              t.active ? "bg-cobalt text-white shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            {t.isNew && (
              <sup
                className={`ml-0.5 font-mono text-[8px] font-bold uppercase tracking-wide ${
                  t.active ? "text-highlight" : "text-cobalt"
                }`}
              >
                new
              </sup>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
