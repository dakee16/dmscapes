// Password policy for setting a new password (signup + account settings).
// Kept in one place so the live checklist UI and the submit-time guard can never
// disagree about what a valid password is.

export interface PasswordRule {
  id: "uppercase" | "special" | "length";
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "uppercase",
    label: "1 uppercase letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "special",
    label: "1 special character",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
  {
    id: "length",
    label: "8 to 12 characters",
    test: (pw) => pw.length >= 8 && pw.length <= 12,
  },
];

/** True only when every rule passes. */
export function passwordMeetsPolicy(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}
