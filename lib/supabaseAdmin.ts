import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

let supabaseAdmin: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Stripe webhooks",
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

  supabaseAdmin ??= createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
