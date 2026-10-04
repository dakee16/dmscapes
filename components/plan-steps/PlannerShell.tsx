"use client";

import { usePathname } from "next/navigation";
import PlannerHeader from "./PlannerHeader";
import css from "./Shell.module.css";

/** The steps before the result: School, Room, Vibe, Budget (and the Pro vibe field). */
const FLOW = ["/plan", "/plan/style", "/plan/budget", "/plan/create-vibe"];

export function isFlowRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return FLOW.includes(path);
}

/**
 * The /plan shell. The step screens get the planner app bar and the page's
 * <main>. The result studio and the draw tools render their own chrome and
 * <main>, so they get their children bare.
 */
export default function PlannerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!isFlowRoute(pathname)) return <>{children}</>;
  return (
    <div className={`ds ${css.shell}`}>
      <PlannerHeader />
      <main id="page-content" tabIndex={-1} className={css.main}>
        {children}
      </main>
    </div>
  );
}
