import type { WorkspaceMember, WorkspaceRole } from "@/lib/workspace";

/** My Room owner colours, by seat: host blue, then magenta, amber and teal.
 * Shared things are never a person colour; they are yellow and hatched. */
export const PERSON_COLORS = ["#2449FF", "#C0186F", "#E8A622", "#0F8B7E"];
/** Text that reads on each seat colour (amber takes ink). */
const PERSON_INK: Record<string, string> = { "#E8A622": "#16161D" };

type Member = Pick<WorkspaceMember, "user_id" | "display_name"> & { role?: WorkspaceRole };

/** Seat order is the members list order (the API returns join order, host first). */
export function seatOf(id: string, members: Member[]) {
  const i = members.findIndex(m => m.user_id === id);
  return i < 0 ? -1 : i;
}
export function personColor(id: string, members: Member[]) {
  const i = seatOf(id, members);
  return PERSON_COLORS[(i < 0 ? 0 : i) % PERSON_COLORS.length];
}
export function personInk(color: string) { return PERSON_INK[color] ?? "#FFFFFF"; }
export function initial(name: string) { return (name.trim()[0] ?? "?").toUpperCase(); }
export function possessive(name: string) { return name.endsWith("s") ? `${name}'` : `${name}'s`; }
export const roleLabel = (role: WorkspaceRole) => role === "owner" ? "Host" : role === "editor" ? "Can edit" : "Can comment";

/** CSS custom properties for one person's dot or avatar. */
export function personStyle(id: string, members: Member[]) {
  const color = personColor(id, members);
  return { "--person": color, "--person-ink": personInk(color) } as React.CSSProperties;
}

/** "2m", "1h", "3d": short ages for comments and versions. */
export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export const money = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
