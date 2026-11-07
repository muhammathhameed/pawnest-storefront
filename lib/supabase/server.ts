import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../../types/database";
import { supabaseFetch } from "./fetch";
import { requireSupabasePublicConfig } from "./config";

export async function getSupabaseServerClient() {
  const { url, anonKey } = requireSupabasePublicConfig("server authentication");

  const cookieStore = await cookies();

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
