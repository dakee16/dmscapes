export const REPORT_CATEGORIES = [
  { value: "bug", label: "Something is broken" },
  { value: "content", label: "Inappropriate content or behavior" },
  { value: "product", label: "Product, price or shopping link" },
  { value: "account", label: "Account or privacy concern" },
  { value: "other", label: "Something else" },
] as const;

/** Page paths only. Never transmit login tokens, invite fragments or queries. */
export function reportPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  try { return new URL(value, "https://dormscape.us").pathname.slice(0, 500); } catch { return null; }
}
