import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../../../types/database";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.searchParams.get("next") ?? "/account";
  const safeDestination = destination.startsWith("/") && !destination.startsWith("//")
    ? destination
    : "/account";
  const response = NextResponse.redirect(
    new URL(safeDestination, request.nextUrl.origin),
  );

  if (code) {
    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Could not exchange Supabase auth callback code:", error);
      return NextResponse.redirect(
        new URL("/login?error=auth_callback", request.nextUrl.origin),
      );
    }
  }

  return response;
}
