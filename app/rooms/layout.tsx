import type { Metadata } from "next";
import s from "@/components/workspace/Workspace.module.css";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function RoomsLayout({ children }: { children: React.ReactNode }) { return <div className={s.app}>{children}</div>; }
