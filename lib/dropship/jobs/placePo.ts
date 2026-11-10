import "server-only";
import { buildSupplierPayloadFor } from "./payload";
import { must, type DropshipDb } from "../db";
import { recordOrderEvent, refreshOrderStatus } from "../rollup";
import { placePurchaseOrder, type SupplierRow } from "../supplierClient";
import type { ShippingAddress } from "../blind";

/** Thrown for transient supplier failures so the runner retries the job. */
export class TransientSupplierError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "TransientSupplierError";
  }
}

interface PoRow {
  id: string;
  order_id: string;
  supplier_id: string;
  status: string;
  idempotency_key: string;
  currency: string;
  blind: boolean;
}

export async function placeSupplierOrder(db: DropshipDb, supplierOrderId: string) {
  const po = must(
    await db
      .from("supplier_orders")
      .select("id, order_id, supplier_id, status, idempotency_key, currency, blind")
      .eq("id", supplierOrderId)
      .maybeSingle(),
    "load PO",
  ) as PoRow | null;
  if (!po) return { skipped: "po_not_found" };
  if (po.status !== "pending") return { skipped: `status_${po.status}` };

  const supplier = must(
    await db
      .from("suppliers")
      .select(
        "id, code, name, status, integration_type, api_base_url, api_key_ref, webhook_secret_ref, ships_from_country, handling_days, supports_blind_shipping",
      )
      .eq("id", po.supplier_id)
      .single(),
    "load supplier",
  ) as SupplierRow;

  const order = must(
    await db.from("orders").select("shipping_address, shipping_name, shipping_phone").eq("id", po.order_id).single(),
    "load order ship-to",
  ) as { shipping_address: Omit<ShippingAddress, "name" | "phone"> | null; shipping_name: string | null; shipping_phone: string | null };
  if (!order.shipping_address || !order.shipping_name) {
    await failPo(db, po, "missing_shipping_address", []);
    return { failed: "missing_shipping_address" };
  }

  const items = must(
    await db
      .from("supplier_order_items")
      .select("supplier_sku, quantity, order_line_id, order_lines(unit_price_cents)")
      .eq("supplier_order_id", po.id),
    "load PO items",
  ) as unknown as Array<{
    supplier_sku: string;
    quantity: number;
    order_line_id: string;
    order_lines: { unit_price_cents: number } | null;
  }>;

  // A supplier that cannot ship blind must not receive a blind order.
  if (po.blind && !supplier.supports_blind_shipping) {
    await failPo(db, po, "supplier_cannot_ship_blind", items.map((i) => i.order_line_id));
    return { failed: "supplier_cannot_ship_blind" };
  }

  const payload = buildSupplierPayloadFor({
    poId: po.id,
    idempotencyKey: po.idempotency_key,
    address: {
      ...order.shipping_address,
      name: order.shipping_name,
      phone: order.shipping_phone,
    },
    blind: po.blind,
    currency: "USD",
    shipsFromCountry: supplier.ships_from_country,
    lines: items.map((i) => ({
      supplierSku: i.supplier_sku,
      quantity: i.quantity,
      unitPriceCents: i.order_lines?.unit_price_cents ?? 0,
    })),
  });

  const result = await placePurchaseOrder(supplier, payload);

  if (result.kind === "retry") throw new TransientSupplierError(result.reason);

  if (result.kind === "rejected") {
    await failPo(db, po, result.reason, items.map((i) => i.order_line_id));
    return { failed: result.reason };
  }

  must(
    await db
      .from("supplier_orders")
      .update({
        status: "placed",
        external_po_id: result.kind === "placed" ? result.externalPoId : null,
        placed_at: new Date().toISOString(),
      })
      .eq("id", po.id)
      .eq("status", "pending"),
    "mark PO placed",
  );
  await recordOrderEvent(
    db,
    po.order_id,
    result.kind === "manual" ? "po.manual_placement_required" : "po.placed",
    { supplier: supplier.code },
    po.id,
  );
  await refreshOrderStatus(db, po.order_id);
  return { placed: true, manual: result.kind === "manual" };
}

/** Marks a PO failed, zeroes the rejecting offers, and reroutes the order. */
export async function failPo(
  db: DropshipDb,
  po: Pick<PoRow, "id" | "order_id" | "supplier_id">,
  reason: string,
  _lineIds: string[],
) {
  must(
    await db
      .from("supplier_orders")
      .update({ status: "failed", failure_reason: reason })
      .eq("id", po.id)
      .in("status", ["pending", "placed", "confirmed"]),
    "mark PO failed",
  );

  // The supplier turned us down, so treat its offers on these items as empty
  // until the next feed says otherwise.
  const offerIds = (
    must(
      await db.from("supplier_order_items").select("offer_id").eq("supplier_order_id", po.id),
      "load failed PO offers",
    ) as Array<{ offer_id: string | null }>
  )
    .map((row) => row.offer_id)
    .filter((id): id is string => !!id);
  if (offerIds.length > 0 && /http_4|rejected|out_of_stock/.test(reason)) {
    must(
      await db.from("supplier_offers").update({ stock_quantity: 0 }).in("id", offerIds),
      "zero rejected offers",
    );
    const variants = must(
      await db.from("supplier_offers").select("variant_id").in("id", offerIds),
      "load variants to refresh",
    ) as Array<{ variant_id: string }>;
    for (const { variant_id } of variants) {
      must(await db.rpc("refresh_variant_availability", { p_variant_id: variant_id }), "refresh availability");
    }
  }

  await recordOrderEvent(db, po.order_id, "po.failed", { reason }, po.id);
  must(
    await db.rpc("enqueue_job", {
      p_type: "order.route",
      p_payload: { orderId: po.order_id },
      p_run_at: new Date().toISOString(),
      p_dedupe_key: `order.route:${po.order_id}`,
    }),
    "enqueue reroute",
  );
  await refreshOrderStatus(db, po.order_id);
}
