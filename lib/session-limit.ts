// The concurrent active-session ceiling per account. Applies to every account
// (free and Plus); the motivation is reducing casual Plus password sharing.
// A new sign-in past this many devices revokes the oldest session. Kept in one
// place so the API route and the migration's default stay in agreement.
export const MAX_CONCURRENT_SESSIONS = 2;
