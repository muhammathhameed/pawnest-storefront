import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "./config";

/** Browser client. Throws a clear error when the public env vars are missing/placeholder. */
export function createClient() {
  const { url, anonKey } = requireSupabasePublicConfig("authentication");
  return createBrowserClient(url, anonKey);
}

// Alias for legacy imports.
export function getSupabaseBrowserClient() {
  return createClient();
}
