/**
 * Post-login redirect helpers. Only same-origin relative paths are accepted,
 * which closes the open-redirect hole in the OAuth/email callback.
 */
const FALLBACK = "/account";

export function safeNextPath(value: string | null | undefined, fallback = FALLBACK): string {
  if (!value) return fallback;
  let v = value.trim();
  try {
    v = decodeURIComponent(v);
  } catch {
    return fallback;
  }
  // Must be a single-slash relative path; block //host, /\host, schemes, control chars.
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(v)) return fallback;
  // Never bounce back into the auth pages (redirect loop guard).
  if (/^\/(login|signup|auth\/callback|forgot-password)(\/|\?|$)/.test(v)) return fallback;
  return v;
}

/** Accepts both `?next=` and legacy `?redirect=` params. */
export function nextFromParams(params: URLSearchParams, fallback = FALLBACK): string {
  return safeNextPath(params.get("next") ?? params.get("redirect"), fallback);
}

export const PROTECTED_PREFIXES = ["/account", "/profile"] as const;
export const ADMIN_PREFIXES = ["/admin"] as const;

export function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
