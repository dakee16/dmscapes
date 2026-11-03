"use client";


export const usd = (n: number) => `$${n.toFixed(2)}`;

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
}

/** Map the stored auth provider to a display name, or null for email/password. */
export function oauthLabel(provider: string | null | undefined): string | null {
  switch ((provider ?? "").toLowerCase()) {
    case "google":
      return "Google";
    case "azure":
    case "microsoft":
      return "Microsoft";
    default:
      return null;
  }
}
