/**
 * Listing rules for supplier-managed variants. This mirrors the SQL function
 * public.refresh_variant_availability (which is the source of truth, run
 * atomically inside the database); the TypeScript version exists so the rule
 * can be unit-tested and reused for previews in an admin UI.
 */

export type UnlistReason = "manual" | "low_stock" | null;

export interface ListingInput {
  /** Stock summed across active offers of active suppliers. */
  availableStock: number;
  safetyStock: number;
  manualUnlisted: boolean;
}

export interface ListingDecision {
  listed: boolean;
  reason: UnlistReason;
  /** Units the storefront may sell: stock minus the safety buffer. */
  sellable: number;
}

export function evaluateListing(input: ListingInput): ListingDecision {
  const sellable = Math.max(input.availableStock - input.safetyStock, 0);
  if (input.manualUnlisted) return { listed: false, reason: "manual", sellable };
  if (input.availableStock < Math.max(input.safetyStock, 1)) {
    return { listed: false, reason: "low_stock", sellable };
  }
  return { listed: true, reason: null, sellable };
}

/** Cache tags used by the storefront for catalog data. */
export const CATALOG_TAG = "products";
export const productTag = (productId: string) => `product:${productId}`;
