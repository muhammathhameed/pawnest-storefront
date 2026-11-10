/**
 * Fulfillment state machines. The order graph is mirrored in the SQL function
 * public.transition_order_status; keep the two in sync (a test asserts it).
 *
 * Order status is a roll-up of its supplier purchase orders (POs), so a split
 * order can truthfully read "partially shipped".
 */

export const ORDER_STATUSES = [
  "unfulfilled",
  "po_placed",
  "partially_shipped",
  "shipped",
  "delivered",
  "exception",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  unfulfilled: ["po_placed", "exception", "cancelled"],
  po_placed: ["partially_shipped", "shipped", "exception", "cancelled"],
  partially_shipped: ["shipped", "exception"],
  shipped: ["delivered", "exception"],
  delivered: ["exception"],
  exception: [
    "unfulfilled", "po_placed", "partially_shipped", "shipped", "delivered",
    "cancelled",
  ],
  cancelled: [],
};

export const PO_STATUSES = [
  "pending",
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "exception",
  "failed",
  "cancelled",
] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export const PO_TRANSITIONS: Record<PoStatus, readonly PoStatus[]> = {
  pending: ["placed", "failed", "cancelled"],
  placed: ["confirmed", "shipped", "failed", "cancelled", "exception"],
  confirmed: ["shipped", "cancelled", "exception"],
  shipped: ["delivered", "exception"],
  delivered: ["exception"],
  exception: ["shipped", "delivered", "cancelled"],
  failed: ["pending", "cancelled"],
  cancelled: [],
};

export class IllegalTransitionError extends Error {
  constructor(kind: "order" | "po", from: string, to: string) {
    super(`Illegal ${kind} transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionPo(from: PoStatus, to: PoStatus): boolean {
  return from === to || PO_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new IllegalTransitionError("order", from, to);
}

export function assertPoTransition(from: PoStatus, to: PoStatus): void {
  if (!canTransitionPo(from, to)) throw new IllegalTransitionError("po", from, to);
}

const SHIPPED_OR_BEYOND: ReadonlySet<PoStatus> = new Set(["shipped", "delivered"]);

/**
 * Derives the order-level status from its purchase orders.
 * Cancelled POs (including ones replaced by a failover) are ignored unless
 * nothing else is left. `failed` and `exception` POs need a human or a retry,
 * so they surface as an order exception.
 */
export function rollupOrderStatus(poStatuses: readonly PoStatus[]): OrderStatus {
  if (poStatuses.length === 0) return "unfulfilled";

  const live = poStatuses.filter((status) => status !== "cancelled");
  if (live.length === 0) return "cancelled";

  if (live.some((s) => s === "failed" || s === "exception")) return "exception";
  if (live.every((s) => s === "delivered")) return "delivered";
  if (live.every((s) => SHIPPED_OR_BEYOND.has(s))) return "shipped";
  if (live.some((s) => SHIPPED_OR_BEYOND.has(s))) return "partially_shipped";
  if (live.every((s) => s === "pending")) return "unfulfilled";
  return "po_placed";
}
