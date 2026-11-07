export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("your-") ||
    normalized.startsWith("your_") ||
    normalized.startsWith("example-") ||
    normalized.startsWith("example.") ||
    normalized.startsWith("placeholder") ||
    normalized.startsWith("replace-") ||
    normalized.startsWith("replace_") ||
    normalized.startsWith("...") ||
    normalized.startsWith("<")
  );
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || isPlaceholder(url) || isPlaceholder(anonKey)) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    if (
      (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
      isPlaceholder(parsedUrl.hostname)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function requireSupabasePublicConfig(context: string) {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      `Supabase is unavailable${context ? ` for ${context}` : ""}. Set valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY values.`,
    );
  }
  return config;
}
