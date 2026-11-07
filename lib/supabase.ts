import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

let supabaseClient: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error();
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTP or HTTPS URL.",
    );
  }

  supabaseClient ??= createClient<Database>(url, anonKey);
  return supabaseClient;
}