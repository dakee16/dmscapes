/** Call only AFTER auth.getUser(token) has verified this exact JWT. A refresh
 * changes iat, not the actual sign-in timestamp in amr. Fail closed if absent. */
export function hasRecentSignIn(verifiedToken: string, now = Date.now()): boolean {
  try {
    const claims = JSON.parse(Buffer.from(verifiedToken.split(".")[1], "base64url").toString("utf8"));
    return Array.isArray(claims.amr) && claims.amr.some((entry: { method?: string; timestamp?: number }) =>
      ["password", "oauth", "otp", "magiclink", "totp", "sso/saml"].includes(entry.method ?? "") &&
      typeof entry.timestamp === "number" && entry.timestamp <= now / 1000 + 30 &&
      entry.timestamp >= now / 1000 - 600
    );
  } catch { return false; }
}
