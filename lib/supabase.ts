import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { supabaseFetch } from "./supabase/fetch";
import { requireSupabasePublicConfig } from "./supabase/config";

let supabaseClient: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseClient() {
  const { url, anonKey } = requireSupabasePublicConfig("the product catalog");

  supabaseClient ??= createClient<Database>(url, anonKey, {
    global: { fetch: supabaseFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return supabaseClient;
}