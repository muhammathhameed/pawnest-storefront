import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "../../../lib/supabase/config";
import { safeNextPath } from "../../../lib/auth/redirect";
import { NEXT_COOKIE } from "../../../lib/auth/next-cookie";
import { isMissingVerifier } from "../../../lib/auth/errors";

export const dynamic = "force-dynamic";

function fail(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message.slice(0, 200));
  const res = NextResponse.redirect(url);
  res.cookies.delete(NEXT_COOKIE);
  return res;
}

/**
 * Handles every Supabase auth return trip:
 *  - OAuth (Google / Microsoft) PKCE:  ?code=...
 *  - Email confirmation / magic link / recovery:  ?code=... or ?token_hash=...&type=...
 *  - Provider errors:  ?error=...&error_description=...
 * Session cookies are written directly onto the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return fail(origin, providerError);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (!code && !(tokenHash && type)) {
    // Implicit-flow links deliver tokens in the URL #fragment, which the server
    // never sees. Hand off to a client page that can read the fragment.
    return NextResponse.redirect(new URL("/auth/complete", origin));
  }

  const type_ = type;
  // Destination: cookie set before signup/OAuth (preferred), ?next= for older emails.
  const cookieNext = request.cookies.get(NEXT_COOKIE)?.value;
  const next =
    type_ === "recovery"
      ? "/reset-password"
      : safeNextPath(searchParams.get("next") ?? cookieNext);

  let config;
  try {
    config = requireSupabasePublicConfig("the auth callback");
  } catch {
    return fail(origin, "Authentication is not configured.");
  }

  const response = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type_!, token_hash: tokenHash! });

  if (error) {
    if (isMissingVerifier(error.message)) {
      // Link opened in a different browser/device than the one that signed up.
      // Supabase already confirmed the address, so just ask the user to sign in.
      const url = new URL("/login", origin);
      url.searchParams.set("notice", "Your email is confirmed. Please sign in with your email and password.");
      const res = NextResponse.redirect(url);
      res.cookies.delete(NEXT_COOKIE);
      return res;
    }
    return fail(origin, error.message);
  }
  response.cookies.delete(NEXT_COOKIE);
  return response;
}
