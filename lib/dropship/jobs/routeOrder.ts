import "server-only";
import { buildSupplierPayloadFor } from "./payload";
import { must, type DropshipDb } from "../db";
import { routingConfig } from "../config";
import {
  convertCents,
  type FxRate,
} from "../pricing";
import {
  planRouting,
  purchaseOrderIdempotencyKey,
  type OfferCandidate,
  type OrderLineInput,
} from "../routing";
import { recordOrderEvent, refreshOrderStatus, transitionOrder } from "../rollup";

/** Thrown when stock changed under us; the job runner retries with backoff. */
export class RoutingRaceError extends Error {
  constructor(detail: string) {
    super(`Routing raced with a stock change: ${detail}`);
    this.name = "RoutingRaceError";
  }
}

interface OrderRow {
  id: string;
  payment_status: string | null;
  currency: string | null;
  fulfillment_status: string;
  blind_shipping: boolean;
  shipping_address: unknown;
}
interface LineRow {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price_cents: number;
  currency: string;
}
interface OfferRow {
  id: string;
  supplier_id: string;
  variant_id: string;
  supplier_sku: string;
  cost_cents: number;
  cost_currency: string;
  stock_quantity: number;
  lead_time_days: number | null;
  priority: number;
  is_active: boolean;
  suppliers: { status: string } | null;
}
interface PoRow { id: string; supplier_id: string; currency: string; status: string }

export async function routeOrder(db: DropshipDb, orderId: string) {
  const order = must(
    await db
      .from("orders")
      .select("id, payment_status, currency, fulfillment_status, blind_shipping, shipping_address")
      .eq("id", orderId)
      .maybeSingle(),
    "load order",
  ) as OrderRow | null;

  if (!order) return { skipped: "order_not_found" };
  if (order.payment_status !== "paid") return { skipped: "not_paid" };
  if (["cancelled", "delivered"].includes(order.fulfillment_status)) {
    return { skipped: `status_${order.fulfillment_status}` };
  }

  if (!order.shipping_address) {
    await transitionOrder(db, orderId, "exception", "missing_shipping_address");
    return { skipped: "missing_shipping_address" };
  }

  const lines = must(
    await db
      .from("order_lines")
      .select("id, variant_id, quantity, unit_price_cents, currency")
      .eq("order_id", orderId),
    "load order lines",
  ) as LineRow[];
  if (lines.length === 0) return { skipped: "no_lines" };

  const pos = must(
    await db.from("supplier_orders").select("id, supplier_id, currency, status").eq("order_id", orderId),
    "load existing POs",
  ) as PoRow[];
  const poById = new Map(pos.map((po) => [po.id, po]));

  const routed = new Set<string>();
  const excluded = new Map<string, Set<string>>();
  if (pos.length > 0) {
    const items = must(
      await db
        .from("supplier_order_items")
        .select("supplier_order_id, order_line_id")
        .in("supplier_order_id", pos.map((po) => po.id)),
      "load PO items",
    ) as Array<{ supplier_order_id: string; order_line_id: string }>;
    for (const item of items) {
      const po = poById.get(item.supplier_order_id);
      if (!po) continue;
      if (po.status === "failed" || po.status === "cancelled") {
        const set = excluded.get(item.order_line_id) ?? new Set<string>();
        set.add(po.supplier_id);
        excluded.set(item.order_line_id, set);
      } else {
        routed.add(item.order_line_id);
      }
    }
  }

  const pending = lines.filter((line) => !routed.has(line.id));
  if (pending.length === 0) {
    await refreshOrderStatus(db, orderId);
    return { skipped: "already_routed" };
  }

  const offers = must(
    await db
      .from("supplier_offers")
      .select(
        "id, supplier_id, variant_id, supplier_sku, cost_cents, cost_currency, stock_quantity, lead_time_days, priority, is_active, suppliers(status)",
      )
      .in("variant_id", [...new Set(pending.map((line) => line.variant_id))]),
    "load supplier offers",
  ) as unknown as OfferRow[];

  const orderCurrency = (order.currency ?? "usd").toUpperCase();
  const rates = (
    must(await db.from("fx_rates").select("base_currency, quote_currency, rate, fetched_at"), "load FX rates") as Array<{
      base_currency: string; quote_currency: string; rate: number | string; fetched_at: string;
    }>
  ).map<FxRate>((r) => ({
    base: r.base_currency,
    quote: r.quote_currency,
    rate: Number(r.rate),
    fetchedAt: new Date(r.fetched_at),
  }));

  const candidates: OfferCandidate[] = offers.map((offer) => ({
    offerId: offer.id,
    supplierId: offer.supplier_id,
    variantId: offer.variant_id,
    supplierSku: offer.supplier_sku,
    costCents: offer.cost_cents,
    costCurrency: offer.cost_currency.toUpperCase(),
    // A stale or missing FX rate throws, and the job retries, rather than
    // silently routing on a made-up cost.
    costInOrderCurrencyCents: convertCents(offer.cost_cents, offer.cost_currency, orderCurrency, rates),
    stockQuantity: offer.stock_quantity,
    leadTimeDays: offer.lead_time_days,
    priority: offer.priority,
    isActive: offer.is_active,
    supplierActive: offer.suppliers?.status === "active",
  }));

  const cfg = routingConfig();
  const lineInputs: OrderLineInput[] = pending.map((line) => ({
    lineId: line.id,
    variantId: line.variant_id,
    quantity: line.quantity,
    unitPriceCents: line.unit_price_cents,
  }));
  const plan = planRouting(lineInputs, candidates, {
    excludedSuppliers: excluded,
    minMarginFraction: cfg.minMarginFraction,
    maxLeadTimeDays: cfg.maxLeadTimeDays,
  });

  const created: string[] = [];
  for (const po of plan.purchaseOrders) {
    const attempt =
      pos.filter(
        (existing) =>
          existing.supplier_id === po.supplierId &&
          existing.currency === po.currency &&
          (existing.status === "failed" || existing.status === "cancelled"),
      ).length + 1;

    const { data, error } = await db.rpc("create_supplier_order", {
      p_order_id: orderId,
      p_supplier_id: po.supplierId,
      p_currency: po.currency,
      p_attempt: attempt,
      p_idempotency_key: purchaseOrderIdempotencyKey(orderId, po, attempt),
      p_blind: order.blind_shipping,
      p_items: po.lines.map((l) => ({
        order_line_id: l.lineId,
        offer_id: l.offerId,
        quantity: l.quantity,
      })),
    });
    if (error) {
      const message = String((error as { message?: string }).message ?? error);
      if (/offer_unavailable|line_already_routed/.test(message)) {
        throw new RoutingRaceError(message);
      }
      throw error;
    }
    const result = data as { supplier_order_id: string; created: boolean };
    created.push(result.supplier_order_id);
    must(
      await db.rpc("enqueue_job", {
        p_type: "po.place",
        p_payload: { supplierOrderId: result.supplier_order_id },
        p_run_at: new Date().toISOString(),
        p_dedupe_key: `po.place:${result.supplier_order_id}`,
      }),
      "enqueue PO placement",
    );
  }

  await recordOrderEvent(db, orderId, "order.routed", {
    purchase_orders: created.length,
    unroutable: plan.unroutable,
  });

  if (plan.unroutable.length > 0) {
    const detail = plan.unroutable.map((u) => `${u.lineId}:${u.reason}`).join(",");
    await transitionOrder(db, orderId, "exception", `unroutable:${detail}`, {
      unroutable: plan.unroutable,
    });
  } else {
    await refreshOrderStatus(db, orderId);
  }

  return { purchaseOrders: created.length, unroutable: plan.unroutable.length };
}

export { buildSupplierPayloadFor };
