"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database";
import { supabaseFetch } from "./fetch";
import { requireSupabasePublicConfig } from "./config";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabasePublicConfig("browser authentication");

  client ??= createBrowserClient<Database>(url, anonKey, {
    global: { fetch: supabaseFetch },
  });
  return client;
}
