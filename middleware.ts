import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./lib/supabase/config";
import {
  ADMIN_PREFIXES,
  PROTECTED_PREFIXES,
  isAdminRole,
  matchesPrefix,
} from "./lib/auth/redirect";

function redirectToLogin(request: NextRequest, supabaseResponse: NextResponse) {
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  const res = NextResponse.redirect(url);
  // Keep any refreshed/cleared session cookies.
  supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Never interfere with the callback itself (no loops).
  if (pathname.startsWith("/auth/callback")) return NextResponse.next();

  // If Supabase fell back to the Site URL (redirectTo not on the allow list) the
  // OAuth code arrives on a random page. Forward it to the callback.
  if (pathname !== "/auth/callback" && (searchParams.has("code") || searchParams.has("token_hash"))
      && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const config = getSupabasePublicConfig();
  let supabaseResponse = NextResponse.next({ request });
  const needsAuth =
    matchesPrefix(pathname, PROTECTED_PREFIXES) || matchesPrefix(pathname, ADMIN_PREFIXES);

  if (!config) {
    // Misconfigured env: fail closed for protected routes, open for public pages.
    return needsAuth ? NextResponse.redirect(new URL("/login?error=Authentication%20is%20not%20configured", request.url)) : supabaseResponse;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT with Supabase and refreshes the session cookies.
  const { data: { user } } = await supabase.auth.getUser();

  if (needsAuth && !user) return redirectToLogin(request, supabaseResponse);

  if (matchesPrefix(pathname, ADMIN_PREFIXES) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!isAdminRole((profile as { role?: string } | null)?.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Signed-in users have no business on /login or /signup.
  if (user && (pathname === "/login" || pathname === "/signup") && !searchParams.has("error")) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
