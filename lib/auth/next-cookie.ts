/**
 * Post-auth destination is carried in a short-lived cookie instead of a query
 * string on redirectTo. Supabase matches redirectTo against the Redirect URLs
 * allow-list, so keeping redirectTo exactly `<origin>/auth/callback` (no query)
 * makes it match an exact allow-list entry and removes that failure mode.
 */
export const NEXT_COOKIE = "af_next";

export function rememberNext(path: string) {
  document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=900; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
