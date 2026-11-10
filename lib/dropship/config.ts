import "server-only";
import type { BrandIdentity } from "./blind";

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function getBrandIdentity(): BrandIdentity {
  return {
    name: process.env.DROPSHIP_BRAND_NAME ?? "PawNest",
    supportEmail: process.env.DROPSHIP_SUPPORT_EMAIL ?? "support@pawnest.example",
    returnAddress: {
      line1: process.env.DROPSHIP_RETURN_LINE1 ?? "",
      line2: process.env.DROPSHIP_RETURN_LINE2 ?? null,
      city: process.env.DROPSHIP_RETURN_CITY ?? "",
      state: process.env.DROPSHIP_RETURN_STATE ?? null,
      postalCode: process.env.DROPSHIP_RETURN_POSTAL_CODE ?? "",
      country: (process.env.DROPSHIP_RETURN_COUNTRY ?? "US").toUpperCase(),
    },
  };
}

export const routingConfig = () => ({
  /** Backup suppliers may not cut margin below this share of the sale price. */
  minMarginFraction: numberFromEnv("DROPSHIP_MIN_MARGIN", 0.1),
  /** Skip suppliers slower than this many days (0 = no limit). */
  maxLeadTimeDays: numberFromEnv("DROPSHIP_MAX_LEAD_DAYS", 0) || undefined,
  /** Days past a supplier's handling window before a PO counts as delayed. */
  overdueGraceDays: numberFromEnv("DROPSHIP_OVERDUE_GRACE_DAYS", 2),
});
