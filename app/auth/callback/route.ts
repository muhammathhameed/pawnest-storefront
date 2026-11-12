import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "../../../lib/supabase/config";
import { safeNextPath } from "../../../lib/auth/redirect";

export const dynamic = "force-dynamic";

function fail(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message.slice(0, 200));
  return NextResponse.redirect(url);
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
  if (!code && !(tokenHash && type)) return fail(origin, "Missing authentication code.");

  const type_ = type;
  // Password recovery always lands on the reset form.
  const next =
    type_ === "recovery" || searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : safeNextPath(searchParams.get("next"));

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

  if (error) return fail(origin, error.message);
  return response;
}
