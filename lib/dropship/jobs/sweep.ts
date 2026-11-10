import "server-only";
import { extractShipping } from "../shipping";
import { getStripeClient } from "../../stripe";
import { must, type DropshipDb } from "../db";
import { routingConfig } from "../config";
import { failPo } from "./placePo";
import { recordOrderEvent } from "../rollup";

async function enqueue(db: DropshipDb, type: string, payload: Record<string, unknown>, dedupeKey: string) {
  must(
    await db.rpc("enqueue_job", {
      p_type: type,
      p_payload: payload,
      p_run_at: new Date().toISOString(),
      p_dedupe_key: dedupeKey,
    }),
    `enqueue ${type}`,
  );
}

/**
 * Self-healing pass, run on a schedule. Each step is independent and
 * idempotent, so a crash anywhere just means the next run picks it up.
 */
export async function runSweep(db: DropshipDb) {
  const summary = { finalized: 0, rerouted: 0, replaced: 0, replaced_pos: 0, registered: 0 };

  // 1. Paid orders whose webhook died before finalizing.
  const unfinalized = must(
    await db.rpc("find_unfinalized_orders", { p_limit: 25 }),
    "find unfinalized orders",
  ) as Array<{ order_id: string; stripe_session_id: string | null }>;
  for (const row of unfinalized) {
    let shipping = null;
    if (row.stripe_session_id) {
      const session = await getStripeClient().checkout.sessions.retrieve(row.stripe_session_id);
      shipping = extractShipping(session as never);
    }
    must(
      await db.rpc("finalize_dropship_order", { p_order_id: row.order_id, p_shipping: shipping }),
      "finalize order",
    );
    summary.finalized += 1;
  }

  // 2. Orders with lines but no PO and no route job in flight.
  const stuck = must(
    await db.rpc("find_stuck_unrouted_orders", { p_older_than_minutes: 15, p_limit: 25 }),
    "find stuck orders",
  ) as Array<{ order_id: string }>;
  for (const row of stuck) {
    await enqueue(db, "order.route", { orderId: row.order_id }, `order.route:${row.order_id}`);
    summary.rerouted += 1;
  }

  // 3. POs created but never sent (placement job died).
  const orphaned = must(
    await db
      .from("supplier_orders")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 30 * 60_000).toISOString())
      .limit(25),
    "find orphaned POs",
  ) as Array<{ id: string }>;
  for (const po of orphaned) {
    await enqueue(db, "po.place", { supplierOrderId: po.id }, `po.place:${po.id}`);
  }

  // 4. Placed POs with no tracking past the supplier's window: fail over.
  const overdue = must(
    await db.rpc("find_overdue_supplier_orders", {
      p_grace_days: routingConfig().overdueGraceDays,
      p_limit: 25,
    }),
    "find overdue POs",
  ) as Array<{ supplier_order_id: string; order_id: string }>;
  for (const row of overdue) {
    const po = must(
      await db.from("supplier_orders").select("id, order_id, supplier_id").eq("id", row.supplier_order_id).single(),
      "load overdue PO",
    ) as { id: string; order_id: string; supplier_id: string };
    await recordOrderEvent(db, po.order_id, "po.overdue", {}, po.id);
    await failPo(db, po, "supplier_delay", []);
    summary.replaced_pos += 1;
  }

  // 5. Tracking numbers waiting to be registered with the carrier tracker.
  const unregistered = must(
    await db
      .from("supplier_orders")
      .select("id")
      .not("tracking_number", "is", null)
      .is("tracking_registered_at", null)
      .in("status", ["placed", "confirmed", "shipped"])
      .limit(50),
    "find unregistered tracking",
  ) as Array<{ id: string }>;
  for (const po of unregistered) {
    await enqueue(db, "tracking.register", { supplierOrderId: po.id }, `tracking.register:${po.id}`);
    summary.registered += 1;
  }

  return summary;
}
