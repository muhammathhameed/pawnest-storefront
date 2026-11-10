import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../../types/database";
import { supabaseFetch } from "./fetch";
import { requireSupabasePublicConfig } from "./config";

export async function getSupabaseServerClient() {
  // Read cookies first: it tells Next.js this render depends on the request,
  // so the page is never prerendered at build time (when Supabase env vars
  // may be absent) before the config check below can throw.
  const cookieStore = await cookies();

  const { url, anonKey } = requireSupabasePublicConfig("server authentication");

  return createServerClient<Database>(url, anonKey, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; middleware refreshes them.
        }
      },
    },
  });
}
