import { NextResponse } from "next/server";
import { getDropshipDb, must } from "../../../../../lib/dropship/db";
import { resolveSecret } from "../../../../../lib/dropship/supplierClient";
import { verifyHmacSha256 } from "../../../../../lib/dropship/webhookAuth";
import { purgeCatalogCache } from "../../../../../lib/dropship/jobs/runner";
import { recordOrderEvent } from "../../../../../lib/dropship/rollup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supplier webhook contract (ours; suppliers adapt to it, or a thin adapter
 * translates their format). Signed with `x-signature: <hex HMAC-SHA256 of the
 * raw body>` using the secret named by suppliers.webhook_secret_ref.
 *
 *   { "event": "inventory", "timestamp": "ISO-8601",
 *     "items": [{ "sku": "...", "stock": 12, "cost_cents": 450, "currency": "USD" }] }
 *   { "event": "shipment", "reference": "<our PO id>",
 *     "tracking_number": "...", "carrier": "DHL" }
 *   { "event": "po.rejected", "reference": "<our PO id>", "reason": "out_of_stock" }
 */
const MAX_ITEMS = 2000;

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  if (!/^[a-z0-9][a-z0-9_-]{1,40}$/.test(code)) {
    return NextResponse.json({ error: "Unknown supplier." }, { status: 404 });
  }

  const db = getDropshipDb();
  const supplier = must(
    await db.from("suppliers").select("id, status, webhook_secret_ref").eq("code", code).maybeSingle(),
    "load supplier",
  ) as { id: string; status: string; webhook_secret_ref: string | null } | null;

  // Same response for "no such supplier" and "no secret" so codes can't be probed.
  const secret = supplier ? resolveSecret(supplier.webhook_secret_ref) : null;
  const rawBody = await request.text();
  if (!supplier || !secret || !verifyHmacSha256(rawBody, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (supplier.status === "disabled") {
    return NextResponse.json({ received: true, ignored: "supplier_disabled" });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be a JSON object." }, { status: 400 });
  }

  try {
    switch (body.event) {
      case "inventory": {
        const items = body.items;
        if (!Array.isArray(items) || items.length > MAX_ITEMS) {
          return NextResponse.json({ error: "items must be an array of at most 2000." }, { status: 400 });
        }
        const ts = typeof body.timestamp === "string" ? new Date(body.timestamp) : null;
        const eventTs = ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : null;

        const result = must(
          await db.rpc("apply_supplier_feed", {
            p_supplier_id: supplier.id,
            p_items: items,
            p_event_ts: eventTs,
          }),
          "apply supplier feed",
        ) as {
          processed: number; stale: number; invalid: number; unmapped: string[];
          listing_changed_product_ids: string[]; reprice_variant_ids: string[];
        };

        for (const variantId of result.reprice_variant_ids) {
          must(
            await db.rpc("enqueue_job", {
              p_type: "variant.reprice",
              p_payload: { variantId },
              p_run_at: new Date().toISOString(),
              p_dedupe_key: `variant.reprice:${variantId}`,
            }),
            "enqueue reprice",
          );
        }
        if (result.listing_changed_product_ids.length > 0) {
          purgeCatalogCache(result.listing_changed_product_ids);
        }
        return NextResponse.json({
          received: true,
          processed: result.processed,
          stale: result.stale,
          invalid: result.invalid,
          unmapped: result.unmapped.length,
        });
      }

      case "shipment": {
        const reference = typeof body.reference === "string" ? body.reference : "";
        const tracking = typeof body.tracking_number === "string" ? body.tracking_number.trim() : "";
        if (!/^[0-9a-f-]{36}$/i.test(reference) || !tracking || tracking.length > 64) {
          return NextResponse.json({ error: "reference and tracking_number are required." }, { status: 400 });
        }
        const po = must(
          await db
            .from("supplier_orders")
            .select("id, order_id, status")
            .eq("id", reference)
            .eq("supplier_id", supplier.id)
            .maybeSingle(),
          "load PO",
        ) as { id: string; order_id: string; status: string } | null;
        if (!po) return NextResponse.json({ error: "Unknown reference." }, { status: 404 });

        must(
          await db
            .from("supplier_orders")
            .update({
              tracking_number: tracking,
              carrier: typeof body.carrier === "string" ? body.carrier.slice(0, 64) : null,
            })
            .eq("id", po.id),
          "save tracking number",
        );
        await recordOrderEvent(db, po.order_id, "po.tracking_assigned", {}, po.id);
        must(
          await db.rpc("enqueue_job", {
            p_type: "tracking.register",
            p_payload: { supplierOrderId: po.id },
            p_run_at: new Date().toISOString(),
            p_dedupe_key: `tracking.register:${po.id}`,
          }),
          "enqueue tracking registration",
        );
        return NextResponse.json({ received: true });
      }

      case "po.rejected": {
        const reference = typeof body.reference === "string" ? body.reference : "";
        if (!/^[0-9a-f-]{36}$/i.test(reference)) {
          return NextResponse.json({ error: "reference is required." }, { status: 400 });
        }
        const { failPo } = await import("../../../../../lib/dropship/jobs/placePo");
        const po = must(
          await db
            .from("supplier_orders")
            .select("id, order_id, supplier_id")
            .eq("id", reference)
            .eq("supplier_id", supplier.id)
            .maybeSingle(),
          "load PO",
        ) as { id: string; order_id: string; supplier_id: string } | null;
        if (!po) return NextResponse.json({ error: "Unknown reference." }, { status: 404 });
        const reason = typeof body.reason === "string" ? body.reason.slice(0, 120) : "rejected";
        await failPo(db, po, `rejected:${reason}`, []);
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true, ignored: "unknown_event" });
    }
  } catch (error) {
    console.error(`Supplier webhook (${code}) failed:`, error);
    // 500 so the supplier retries; every operation above is idempotent.
    return NextResponse.json({ error: "Could not process webhook." }, { status: 500 });
  }
}
