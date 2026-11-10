import { getSupabasePublicConfig } from "./config";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getSupabaseServerClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    // Fallback gracefully during build or when unconfigured instead of throwing hard error
    return createServerClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
      { cookies: { getAll: () => [] } }
    );
  }
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies();
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies();
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored from Server Components
        }
      },
    },
  });
}

export async function createClient() {
  return getSupabaseServerClient();
}
