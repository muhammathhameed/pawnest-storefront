import type { Cents } from "./money";

/** One purchasable source for a variant. */
export interface OfferCandidate {
  offerId: string;
  supplierId: string;
  variantId: string;
  supplierSku: string;
  /** Cost in the supplier's own currency (what the PO is placed in). */
  costCents: Cents;
  costCurrency: string;
  /** Cost converted to the order currency, used only for the margin guard. */
  costInOrderCurrencyCents: Cents;
  stockQuantity: number;
  leadTimeDays: number | null;
  /** Lower = preferred. */
  priority: number;
  isActive: boolean;
  supplierActive: boolean;
}

export interface OrderLineInput {
  lineId: string;
  variantId: string;
  quantity: number;
  /** What the customer paid per unit, in the order currency. */
  unitPriceCents: Cents;
}

export interface RoutingOptions {
  /** Supplier IDs that already failed or were cancelled for a line. */
  excludedSuppliers?: ReadonlyMap<string, ReadonlySet<string>>;
  /** Skip offers slower than this. */
  maxLeadTimeDays?: number;
  /**
   * Skip offers whose margin would fall below this fraction of the sale price
   * (e.g. 0.15). A pricier backup supplier should not quietly erase profit.
   */
  minMarginFraction?: number;
  /**
   * "priority": every line goes to its best-ranked offer (fewer surprises).
   * "consolidate": prefer suppliers that can cover several lines at once to
   * reduce the number of POs and shipments.
   */
  strategy?: "priority" | "consolidate";
}

export interface PlannedPoLine {
  lineId: string;
  offerId: string;
  supplierSku: string;
  quantity: number;
  unitCostCents: Cents;
}

export interface PlannedPo {
  supplierId: string;
  currency: string;
  lines: PlannedPoLine[];
  totalCostCents: Cents;
}

export type UnroutableReason =
  | "no_offers"
  | "out_of_stock"
  | "excluded"
  | "too_slow"
  | "margin_too_low";

export interface UnroutableLine {
  lineId: string;
  reason: UnroutableReason;
}

export interface RoutingPlan {
  purchaseOrders: PlannedPo[];
  unroutable: UnroutableLine[];
}

function rank(a: OfferCandidate, b: OfferCandidate): number {
  return (
    a.priority - b.priority ||
    a.costInOrderCurrencyCents - b.costInOrderCurrencyCents ||
    (a.leadTimeDays ?? Number.MAX_SAFE_INTEGER) -
      (b.leadTimeDays ?? Number.MAX_SAFE_INTEGER) ||
    a.offerId.localeCompare(b.offerId)
  );
}

interface Eligibility {
  eligible: OfferCandidate[];
  reason: UnroutableReason;
}

function eligibleOffers(
  line: OrderLineInput,
  offers: readonly OfferCandidate[],
  options: RoutingOptions,
): Eligibility {
  const forVariant = offers.filter((o) => o.variantId === line.variantId);
  if (forVariant.length === 0) return { eligible: [], reason: "no_offers" };

  let pool = forVariant.filter((o) => o.isActive && o.supplierActive);
  if (pool.length === 0) return { eligible: [], reason: "no_offers" };

  const excluded = options.excludedSuppliers?.get(line.lineId);
  if (excluded && excluded.size > 0) {
    pool = pool.filter((o) => !excluded.has(o.supplierId));
    if (pool.length === 0) return { eligible: [], reason: "excluded" };
  }

  pool = pool.filter((o) => o.stockQuantity >= line.quantity);
  if (pool.length === 0) return { eligible: [], reason: "out_of_stock" };

  if (options.maxLeadTimeDays !== undefined) {
    const limit = options.maxLeadTimeDays;
    pool = pool.filter((o) => o.leadTimeDays === null || o.leadTimeDays <= limit);
    if (pool.length === 0) return { eligible: [], reason: "too_slow" };
  }

  if (options.minMarginFraction !== undefined && line.unitPriceCents > 0) {
    const floor = options.minMarginFraction;
    pool = pool.filter(
      (o) =>
        (line.unitPriceCents - o.costInOrderCurrencyCents) / line.unitPriceCents >=
        floor,
    );
    if (pool.length === 0) return { eligible: [], reason: "margin_too_low" };
  }

  return { eligible: pool.sort(rank), reason: "no_offers" };
}

function groupIntoPurchaseOrders(
  chosen: ReadonlyArray<{ line: OrderLineInput; offer: OfferCandidate }>,
): PlannedPo[] {
  const byKey = new Map<string, PlannedPo>();
  for (const { line, offer } of chosen) {
    // A PO is placed in one currency with one supplier.
    const key = `${offer.supplierId}|${offer.costCurrency}`;
    let po = byKey.get(key);
    if (!po) {
      po = {
        supplierId: offer.supplierId,
        currency: offer.costCurrency,
        lines: [],
        totalCostCents: 0,
      };
      byKey.set(key, po);
    }
    po.lines.push({
      lineId: line.lineId,
      offerId: offer.offerId,
      supplierSku: offer.supplierSku,
      quantity: line.quantity,
      unitCostCents: offer.costCents,
    });
    po.totalCostCents += offer.costCents * line.quantity;
  }
  return [...byKey.values()].sort((a, b) =>
    a.supplierId.localeCompare(b.supplierId),
  );
}

/**
 * Plans how to source an order: picks an offer per line (with failover to the
 * next-best supplier when the preferred one is out of stock, excluded, too
 * slow or too expensive) and splits the result into one PO per supplier.
 * Pure: it never touches the database, so it is easy to test.
 */
export function planRouting(
  lines: readonly OrderLineInput[],
  offers: readonly OfferCandidate[],
  options: RoutingOptions = {},
): RoutingPlan {
  const unroutable: UnroutableLine[] = [];
  const eligibility = new Map<string, OfferCandidate[]>();

  for (const line of lines) {
    const result = eligibleOffers(line, offers, options);
    if (result.eligible.length === 0) {
      unroutable.push({ lineId: line.lineId, reason: result.reason });
    } else {
      eligibility.set(line.lineId, result.eligible);
    }
  }

  const routable = lines.filter((line) => eligibility.has(line.lineId));
  const chosen: Array<{ line: OrderLineInput; offer: OfferCandidate }> = [];

  if (options.strategy === "consolidate") {
    const remaining = new Map(routable.map((line) => [line.lineId, line]));
    while (remaining.size > 0) {
      // Pick the supplier able to cover the most remaining lines; break ties
      // by the best (lowest) summed priority, then by total cost.
      const stats = new Map<
        string,
        { count: number; priority: number; cost: number }
      >();
      for (const line of remaining.values()) {
        const seen = new Set<string>();
        for (const offer of eligibility.get(line.lineId)!) {
          if (seen.has(offer.supplierId)) continue;
          seen.add(offer.supplierId);
          const entry = stats.get(offer.supplierId) ?? {
            count: 0, priority: 0, cost: 0,
          };
          entry.count += 1;
          entry.priority += offer.priority;
          entry.cost += offer.costInOrderCurrencyCents * line.quantity;
          stats.set(offer.supplierId, entry);
        }
      }
      const best = [...stats.entries()].sort(
        (a, b) =>
          b[1].count - a[1].count ||
          a[1].priority - b[1].priority ||
          a[1].cost - b[1].cost ||
          a[0].localeCompare(b[0]),
      )[0][0];

      for (const line of [...remaining.values()]) {
        const offer = eligibility
          .get(line.lineId)!
          .find((candidate) => candidate.supplierId === best);
        if (offer) {
          chosen.push({ line, offer });
          remaining.delete(line.lineId);
        }
      }
    }
  } else {
    for (const line of routable) {
      chosen.push({ line, offer: eligibility.get(line.lineId)![0] });
    }
  }

  return { purchaseOrders: groupIntoPurchaseOrders(chosen), unroutable };
}

/** Deterministic key so replaying the routing job never duplicates a PO. */
export function purchaseOrderIdempotencyKey(
  orderId: string,
  po: Pick<PlannedPo, "supplierId" | "currency">,
  attempt: number,
): string {
  return `${orderId}:${po.supplierId}:${po.currency}:${attempt}`;
}

/**
 * Delay-based failover: a PO that was placed but has no tracking after the
 * supplier's handling window plus a grace period should be rerouted.
 */
export function isPoOverdue(
  po: { status: string; placedAt: Date | null; trackingNumber: string | null },
  handlingDays: number,
  graceDays: number,
  now: Date = new Date(),
): boolean {
  if (po.status !== "placed" && po.status !== "confirmed") return false;
  if (po.trackingNumber || !po.placedAt) return false;
  const deadline =
    po.placedAt.getTime() + (handlingDays + graceDays) * 86_400_000;
  return now.getTime() > deadline;
}
