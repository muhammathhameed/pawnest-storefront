import "server-only";
import { must, type DropshipDb } from "../db";
import { convertCents, computeSellPrice, type FxRate, type MarkupRule } from "../pricing";

export async function loadMarkupRules(db: DropshipDb): Promise<MarkupRule[]> {
  const rows = must(
    await db
      .from("markup_rules")
      .select("id, name, min_cost_cents, max_cost_cents, multiplier, flat_cents, round_to_cents, priority, is_active")
      .eq("is_active", true),
    "load markup rules",
  ) as Array<{
    id: string; name: string; min_cost_cents: number; max_cost_cents: number | null;
    multiplier: number | string; flat_cents: number; round_to_cents: number | null;
    priority: number; is_active: boolean;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    minCostCents: r.min_cost_cents,
    maxCostCents: r.max_cost_cents,
    multiplier: Number(r.multiplier),
    flatCents: r.flat_cents,
    roundToCents: r.round_to_cents,
    priority: r.priority,
    isActive: r.is_active,
  }));
}

/**
 * Reprices a supplier-managed variant from its preferred in-stock offer and
 * syncs products.price, which checkout reads. Variants without offers are
 * left alone so hand-priced products are never overwritten.
 */
export async function repriceVariant(db: DropshipDb, variantId: string) {
  const variant = must(
    await db.from("product_variants").select("id, product_id").eq("id", variantId).maybeSingle(),
    "load variant",
  ) as { id: string; product_id: string } | null;
  if (!variant) return { skipped: "variant_not_found" };

  const offers = must(
    await db
      .from("supplier_offers")
      .select("cost_cents, cost_currency, stock_quantity, priority, suppliers(status)")
      .eq("variant_id", variantId)
      .eq("is_active", true),
    "load offers to price",
  ) as unknown as Array<{
    cost_cents: number; cost_currency: string; stock_quantity: number; priority: number;
    suppliers: { status: string } | null;
  }>;
  const usable = offers.filter((o) => o.suppliers?.status === "active");
  if (usable.length === 0) return { skipped: "no_offers" };

  // Price off the supplier we would actually route to: best priority among
  // those with stock, falling back to all active offers when everything is out.
  const inStock = usable.filter((o) => o.stock_quantity > 0);
  const pool = (inStock.length > 0 ? inStock : usable).sort(
    (a, b) => a.priority - b.priority || a.cost_cents - b.cost_cents,
  );
  const chosen = pool[0];

  const rates = (
    must(await db.from("fx_rates").select("base_currency, quote_currency, rate, fetched_at"), "load FX rates") as Array<{
      base_currency: string; quote_currency: string; rate: number | string; fetched_at: string;
    }>
  ).map<FxRate>((r) => ({
    base: r.base_currency, quote: r.quote_currency, rate: Number(r.rate), fetchedAt: new Date(r.fetched_at),
  }));

  const costUsd = convertCents(chosen.cost_cents, chosen.cost_currency, "USD", rates);
  const { priceCents, ruleName } = computeSellPrice(costUsd, await loadMarkupRules(db));

  must(
    await db.from("product_variants").update({ price_cents: priceCents }).eq("id", variantId),
    "save variant price",
  );

  // Storefront price = cheapest listed variant ("from" price).
  const listed = must(
    await db
      .from("product_variants")
      .select("price_cents")
      .eq("product_id", variant.product_id)
      .eq("listed", true)
      .not("price_cents", "is", null),
    "load listed variant prices",
  ) as Array<{ price_cents: number }>;
  if (listed.length > 0) {
    const lowest = Math.min(...listed.map((v) => v.price_cents));
    must(
      await db.from("products").update({ price: lowest / 100 }).eq("id", variant.product_id),
      "sync product price",
    );
  }
  return { priceCents, ruleName, productId: variant.product_id };
}
