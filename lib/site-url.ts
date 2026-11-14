/**
 * Canonical public origin for redirects (Stripe success/cancel URLs, emails).
 * Never derived from the incoming request: behind Codespaces / proxies that
 * origin can be github.dev or another temporary host, which customers must
 * never be sent to.
 */
export const CANONICAL_SITE_URL = "https://pawnest-storefront.vercel.app";

const TUNNEL_HOST =
  /(^|\.)(github\.dev|app\.github\.dev|githubpreview\.dev|codespaces\.[a-z.]+|gitpod\.io|ngrok(-free)?\.(app|io|dev))$/i;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/i;

type Env = Record<string, string | undefined>;

function parse(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function resolveSiteUrl(env: Env = process.env): string {
  const vercelEnv = env.VERCEL_ENV; // "production" | "preview" | "development" | undefined
  const deployed = Boolean(vercelEnv) || env.NODE_ENV === "production";
  const configured = parse(env.NEXT_PUBLIC_SITE_URL);

  // Tunnel/Codespaces hosts are never valid customer-facing origins.
  const usable =
    configured &&
    !TUNNEL_HOST.test(configured.hostname) &&
    !(deployed && LOCAL_HOST.test(configured.hostname)) &&
    (configured.protocol === "https:" || (!deployed && configured.protocol === "http:"));

  if (vercelEnv === "production") {
    if (usable && configured.protocol === "https:") return configured.origin;
    return CANONICAL_SITE_URL;
  }

  if (vercelEnv === "preview") {
    const preview = parse(env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined);
    return preview ? preview.origin : CANONICAL_SITE_URL;
  }

  // Local development (or a self-hosted build without Vercel).
  if (usable) return configured.origin;
  if (env.NODE_ENV !== "production") return "http://localhost:3000";
  return CANONICAL_SITE_URL;
}
