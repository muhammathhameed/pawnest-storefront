import "server-only";
import { must, type DropshipDb } from "./db";
import {
  canTransitionOrder,
  rollupOrderStatus,
  type OrderStatus,
  type PoStatus,
} from "./stateMachine";

/** Exceptions a person has to resolve; the roll-up never clears these. */
const STICKY_EXCEPTION_PREFIXES = ["unroutable", "missing_shipping", "manual"];

export async function recordOrderEvent(
  db: DropshipDb,
  orderId: string,
  type: string,
  payload: Record<string, unknown> = {},
  supplierOrderId: string | null = null,
) {
  must(
    await db.from("order_events").insert({
      order_id: orderId,
      supplier_order_id: supplierOrderId,
      type,
      payload,
    }),
    `record event ${type}`,
  );
}

export async function transitionOrder(
  db: DropshipDb,
  orderId: string,
  to: OrderStatus,
  reason: string | null = null,
  payload: Record<string, unknown> = {},
  supplierOrderId: string | null = null,
) {
  return must(
    await db.rpc("transition_order_status", {
      p_order_id: orderId,
      p_to_status: to,
      p_reason: reason,
      p_payload: payload,
      p_supplier_order_id: supplierOrderId,
    }),
    `transition order to ${to}`,
  ) as { changed: boolean; from: string; to: string };
}

/**
 * Recomputes an order's status from its purchase orders and applies it when
 * the move is legal. Safe to call repeatedly.
 */
export async function refreshOrderStatus(db: DropshipDb, orderId: string) {
  const order = must(
    await db
      .from("orders")
      .select("fulfillment_status, exception_reason")
      .eq("id", orderId)
      .maybeSingle(),
    "load order for roll-up",
  ) as { fulfillment_status: OrderStatus; exception_reason: string | null } | null;
  if (!order || order.fulfillment_status === "cancelled") return null;

  const pos = must(
    await db.from("supplier_orders").select("status").eq("order_id", orderId),
    "load POs for roll-up",
  ) as Array<{ status: PoStatus }>;
  const target = rollupOrderStatus(pos.map((po) => po.status));

  if (target === order.fulfillment_status) return target;
  if (
    order.fulfillment_status === "exception" &&
    target !== "exception" &&
    STICKY_EXCEPTION_PREFIXES.some((p) => order.exception_reason?.startsWith(p))
  ) {
    return order.fulfillment_status;
  }
  if (!canTransitionOrder(order.fulfillment_status, target)) return order.fulfillment_status;

  const reason = target === "exception" ? "supplier_order_problem" : null;
  await transitionOrder(db, orderId, target, reason);
  return target;
}
