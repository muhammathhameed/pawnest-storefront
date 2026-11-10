import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { toMinorUnits, multiplyCents } from "../money";
import {
  computeSellPrice,
  convertCents,
  MissingFxRateError,
  NoMarkupRuleError,
  roundUpToEnding,
  selectMarkupRule,
  StaleFxRateError,
  type FxRate,
  type MarkupRule,
} from "../pricing";
import { evaluateListing } from "../inventory";
import {
  isPoOverdue,
  planRouting,
  purchaseOrderIdempotencyKey,
  type OfferCandidate,
  type OrderLineInput,
} from "../routing";
import {
  assertOrderTransition,
  canTransitionOrder,
  canTransitionPo,
  IllegalTransitionError,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  rollupOrderStatus,
} from "../stateMachine";
import { buildSupplierPayload, toCustomerShipmentView } from "../blind";

const rules: MarkupRule[] = [
  { id: "r1", name: "<$10 3x", minCostCents: 0, maxCostCents: 1000, multiplier: 3, flatCents: 0, roundToCents: null, priority: 100, isActive: true },
  { id: "r2", name: "$10-50 2x+$5", minCostCents: 1000, maxCostCents: 5000, multiplier: 2, flatCents: 500, roundToCents: null, priority: 100, isActive: true },
  { id: "r3", name: "$50+ 1.6x", minCostCents: 5000, maxCostCents: null, multiplier: 1.6, flatCents: 0, roundToCents: null, priority: 100, isActive: true },
];

describe("money", () => {
  it("converts dollars to cents without float drift", () => {
    assert.equal(toMinorUnits(19.99), 1999);
    assert.equal(toMinorUnits(1.005), 101);
    assert.equal(toMinorUnits(100, "JPY"), 100);
    assert.equal(multiplyCents(333, 3), 999);
  });
  it("rejects bad input", () => {
    assert.throws(() => toMinorUnits(-1));
    assert.throws(() => multiplyCents(1.5, 2));
  });
});

describe("markup rules", () => {
  it("applies the agreed brackets", () => {
    assert.equal(computeSellPrice(400, rules).priceCents, 1200); // $4 -> 3x = $12
    assert.equal(computeSellPrice(999, rules).priceCents, 2997); // just under $10 -> 3x
    assert.equal(computeSellPrice(1000, rules).priceCents, 2500); // $10 -> 2x + $5 = $25
    assert.equal(computeSellPrice(4000, rules).priceCents, 8500); // $40 -> $85
    assert.equal(computeSellPrice(4999, rules).priceCents, 10498); // 4999*2 + 500
    assert.equal(computeSellPrice(5000, rules).priceCents, 8000); // $50 -> third bracket
  });
  it("breaks overlap ties by priority, then by higher floor", () => {
    const overlapping: MarkupRule[] = [
      { ...rules[0], id: "wide", maxCostCents: 5000, priority: 100 },
      { ...rules[1], id: "narrow", minCostCents: 500, maxCostCents: 2000, priority: 100 },
      { ...rules[1], id: "vip", minCostCents: 0, maxCostCents: 5000, priority: 1 },
    ];
    assert.equal(selectMarkupRule(1000, overlapping)?.id, "vip");
    assert.equal(selectMarkupRule(1000, overlapping.slice(0, 2))?.id, "narrow");
  });
  it("ignores inactive rules and throws when nothing matches", () => {
    const inactive = rules.map((r) => ({ ...r, isActive: false }));
    assert.equal(selectMarkupRule(400, inactive), null);
    assert.throws(() => computeSellPrice(400, inactive), NoMarkupRuleError);
  });
  it("supports price endings and a price floor", () => {
    assert.equal(roundUpToEnding(1200, 99), 1299);
    assert.equal(roundUpToEnding(1299, 99), 1299);
    assert.equal(roundUpToEnding(1300, 99), 1399);
    const charm = rules.map((r) => ({ ...r, roundToCents: 99 }));
    assert.equal(computeSellPrice(400, charm).priceCents, 1299);
    assert.equal(computeSellPrice(100, rules, { minPriceCents: 999 }).priceCents, 999);
  });
});

describe("currency conversion", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const fresh = new Date("2026-11-08T06:00:00Z");
  const rates: FxRate[] = [
    { base: "USD", quote: "EUR", rate: 0.9, fetchedAt: fresh },
    { base: "USD", quote: "JPY", rate: 150, fetchedAt: fresh },
  ];
  it("converts direct, inverse and via the USD pivot", () => {
    assert.equal(convertCents(1000, "USD", "EUR", rates, { now }), 900);
    assert.equal(convertCents(900, "EUR", "USD", rates, { now }), 1000);
    assert.equal(convertCents(900, "EUR", "JPY", rates, { now }), 1500);
    assert.equal(convertCents(1234, "USD", "USD", [], { now }), 1234);
  });
  it("handles zero-decimal currencies", () => {
    assert.equal(convertCents(1000, "USD", "JPY", rates, { now }), 1500);
  });
  it("fails loudly on missing or stale rates", () => {
    assert.throws(() => convertCents(100, "USD", "GBP", rates, { now }), MissingFxRateError);
    const old = [{ base: "USD", quote: "EUR", rate: 0.9, fetchedAt: new Date("2026-11-01T00:00:00Z") }];
    assert.throws(() => convertCents(100, "USD", "EUR", old, { now }), StaleFxRateError);
  });
});

describe("listing rule", () => {
  it("unlists below the safety threshold and relists above it", () => {
    assert.deepEqual(evaluateListing({ availableStock: 10, safetyStock: 3, manualUnlisted: false }), { listed: true, reason: null, sellable: 7 });
    assert.deepEqual(evaluateListing({ availableStock: 3, safetyStock: 3, manualUnlisted: false }), { listed: true, reason: null, sellable: 0 });
    assert.equal(evaluateListing({ availableStock: 2, safetyStock: 3, manualUnlisted: false }).listed, false);
  });
  it("never lists zero stock, even with zero safety stock", () => {
    const d = evaluateListing({ availableStock: 0, safetyStock: 0, manualUnlisted: false });
    assert.equal(d.listed, false);
    assert.equal(d.reason, "low_stock");
  });
  it("manual unlist always wins", () => {
    assert.equal(evaluateListing({ availableStock: 99, safetyStock: 0, manualUnlisted: true }).reason, "manual");
  });
});

const offer = (o: Partial<OfferCandidate> & Pick<OfferCandidate, "offerId" | "supplierId" | "variantId">): OfferCandidate => ({
  supplierSku: `${o.supplierId}-${o.variantId}`,
  costCents: 400,
  costCurrency: "USD",
  costInOrderCurrencyCents: 400,
  stockQuantity: 10,
  leadTimeDays: 5,
  priority: 100,
  isActive: true,
  supplierActive: true,
  ...o,
});
const line = (lineId: string, variantId: string, quantity = 1, unitPriceCents = 1200): OrderLineInput => ({ lineId, variantId, quantity, unitPriceCents });

describe("routing and split orders", () => {
  it("fails over to the next supplier on stockout", () => {
    const offers = [
      offer({ offerId: "a1", supplierId: "A", variantId: "v1", priority: 1, stockQuantity: 0 }),
      offer({ offerId: "b1", supplierId: "B", variantId: "v1", priority: 2 }),
    ];
    const plan = planRouting([line("l1", "v1")], offers);
    assert.equal(plan.purchaseOrders.length, 1);
    assert.equal(plan.purchaseOrders[0].supplierId, "B");
  });
  it("splits a multi-item cart into one PO per supplier", () => {
    const offers = [
      offer({ offerId: "a1", supplierId: "A", variantId: "v1", priority: 1, costCents: 300 }),
      offer({ offerId: "b2", supplierId: "B", variantId: "v2", priority: 1, costCents: 500 }),
      offer({ offerId: "a3", supplierId: "A", variantId: "v3", priority: 1, costCents: 200 }),
    ];
    const plan = planRouting([line("l1", "v1", 2), line("l2", "v2"), line("l3", "v3")], offers);
    assert.equal(plan.purchaseOrders.length, 2);
    const a = plan.purchaseOrders.find((p) => p.supplierId === "A")!;
    assert.equal(a.lines.length, 2);
    assert.equal(a.totalCostCents, 300 * 2 + 200);
    assert.deepEqual(plan.unroutable, []);
  });
  it("consolidate strategy reduces PO count when a supplier covers several lines", () => {
    const offers = [
      offer({ offerId: "a1", supplierId: "A", variantId: "v1", priority: 1 }),
      offer({ offerId: "b1", supplierId: "B", variantId: "v1", priority: 2 }),
      offer({ offerId: "b2", supplierId: "B", variantId: "v2", priority: 1 }),
    ];
    const lines = [line("l1", "v1"), line("l2", "v2")];
    assert.equal(planRouting(lines, offers).purchaseOrders.length, 2);
    const merged = planRouting(lines, offers, { strategy: "consolidate" });
    assert.equal(merged.purchaseOrders.length, 1);
    assert.equal(merged.purchaseOrders[0].supplierId, "B");
  });
  it("reports why a line cannot be routed", () => {
    const offers = [offer({ offerId: "a1", supplierId: "A", variantId: "v1", stockQuantity: 1 })];
    assert.equal(planRouting([line("x", "nope")], offers).unroutable[0].reason, "no_offers");
    assert.equal(planRouting([line("x", "v1", 5)], offers).unroutable[0].reason, "out_of_stock");
    const excluded = new Map([["x", new Set(["A"])]]);
    assert.equal(planRouting([line("x", "v1")], offers, { excludedSuppliers: excluded }).unroutable[0].reason, "excluded");
    assert.equal(
      planRouting([line("x", "v1")], [offer({ offerId: "s", supplierId: "S", variantId: "v1", leadTimeDays: 30 })], { maxLeadTimeDays: 14 }).unroutable[0].reason,
      "too_slow",
    );
  });
  it("blocks a backup supplier that would erase the margin", () => {
    const offers = [
      offer({ offerId: "a1", supplierId: "A", variantId: "v1", priority: 1, stockQuantity: 0 }),
      offer({ offerId: "b1", supplierId: "B", variantId: "v1", priority: 2, costInOrderCurrencyCents: 1100 }),
    ];
    const plan = planRouting([line("l1", "v1", 1, 1200)], offers, { minMarginFraction: 0.15 });
    assert.equal(plan.purchaseOrders.length, 0);
    assert.equal(plan.unroutable[0].reason, "margin_too_low");
  });
  it("ignores inactive offers and paused suppliers", () => {
    const offers = [
      offer({ offerId: "a1", supplierId: "A", variantId: "v1", priority: 1, isActive: false }),
      offer({ offerId: "b1", supplierId: "B", variantId: "v1", priority: 2, supplierActive: false }),
      offer({ offerId: "c1", supplierId: "C", variantId: "v1", priority: 3 }),
    ];
    assert.equal(planRouting([line("l1", "v1")], offers).purchaseOrders[0].supplierId, "C");
  });
  it("is deterministic and keys POs idempotently", () => {
    const offers = [
      offer({ offerId: "a1", supplierId: "A", variantId: "v1" }),
      offer({ offerId: "b1", supplierId: "B", variantId: "v1" }),
    ];
    const one = planRouting([line("l1", "v1")], offers);
    const two = planRouting([line("l1", "v1")], [...offers].reverse());
    assert.deepEqual(one, two);
    assert.equal(purchaseOrderIdempotencyKey("o1", { supplierId: "A", currency: "USD" }, 2), "o1:A:USD:2");
  });
  it("detects POs that are overdue for shipping", () => {
    const placedAt = new Date("2026-11-01T00:00:00Z");
    const po = { status: "placed", placedAt, trackingNumber: null };
    assert.equal(isPoOverdue(po, 2, 1, new Date("2026-11-03T00:00:00Z")), false);
    assert.equal(isPoOverdue(po, 2, 1, new Date("2026-11-05T00:00:00Z")), true);
    assert.equal(isPoOverdue({ ...po, trackingNumber: "T1" }, 2, 1, new Date("2026-11-30T00:00:00Z")), false);
    assert.equal(isPoOverdue({ ...po, status: "shipped" }, 2, 1, new Date("2026-11-30T00:00:00Z")), false);
  });
});

describe("state machines", () => {
  it("allows the happy path and blocks skips", () => {
    assert.ok(canTransitionOrder("unfulfilled", "po_placed"));
    assert.ok(canTransitionOrder("po_placed", "shipped"));
    assert.ok(canTransitionOrder("shipped", "delivered"));
    assert.ok(!canTransitionOrder("unfulfilled", "delivered"));
    assert.ok(!canTransitionOrder("delivered", "shipped"));
    assert.ok(!canTransitionOrder("cancelled", "unfulfilled"));
    assert.throws(() => assertOrderTransition("po_placed", "delivered"), IllegalTransitionError);
    assert.ok(canTransitionPo("pending", "placed"));
    assert.ok(!canTransitionPo("delivered", "placed"));
  });
  it("matches the transition graph enforced in SQL", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261108000100_dropship_core.sql"),
      "utf8",
    );
    const body = sql.slice(sql.indexOf("v_allowed := CASE v_from"));
    const caseBlock = body.slice(0, body.indexOf("END;"));
    const fromSql: Record<string, string[]> = {};
    for (const match of caseBlock.matchAll(/WHEN '(\w+)' THEN p_to_status IN \(([^)]*)\)/g)) {
      fromSql[match[1]] = [...match[2].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    }
    for (const status of ORDER_STATUSES) {
      if (status === "cancelled") {
        assert.equal(fromSql[status], undefined, "cancelled is terminal (ELSE false)");
        continue;
      }
      assert.deepEqual([...(fromSql[status] ?? [])].sort(), [...ORDER_TRANSITIONS[status]].sort(), status);
    }
  });
  it("lets live statuses fall into exception", () => {
    for (const s of ["unfulfilled", "po_placed", "partially_shipped", "shipped", "delivered"] as const) {
      assert.ok(canTransitionOrder(s, "exception"), s);
    }
  });
  it("rolls PO statuses up to an order status", () => {
    assert.equal(rollupOrderStatus([]), "unfulfilled");
    assert.equal(rollupOrderStatus(["pending"]), "unfulfilled");
    assert.equal(rollupOrderStatus(["pending", "placed"]), "po_placed");
    assert.equal(rollupOrderStatus(["placed", "confirmed"]), "po_placed");
    assert.equal(rollupOrderStatus(["shipped", "placed"]), "partially_shipped");
    assert.equal(rollupOrderStatus(["shipped", "delivered"]), "shipped");
    assert.equal(rollupOrderStatus(["delivered", "delivered"]), "delivered");
    assert.equal(rollupOrderStatus(["delivered", "cancelled"]), "delivered");
    assert.equal(rollupOrderStatus(["cancelled", "cancelled"]), "cancelled");
    assert.equal(rollupOrderStatus(["shipped", "exception"]), "exception");
    assert.equal(rollupOrderStatus(["placed", "failed"]), "exception");
    // a failed PO that was rerouted is marked cancelled, so the order recovers
    assert.equal(rollupOrderStatus(["cancelled", "placed"]), "po_placed");
  });
});

describe("blind shipping", () => {
  const brand = {
    name: "PawNest",
    returnAddress: { line1: "1 Hub St", city: "Austin", postalCode: "78701", country: "US" },
    supportEmail: "help@pawnest.example",
  };
  const address = { name: "Sam", line1: "9 Elm", city: "Leeds", postalCode: "LS1", country: "GB" };
  const base = {
    reference: "PO-1",
    idempotencyKey: "o:A:USD:1",
    lines: [{ supplierSku: "SKU1", quantity: 2, unitPriceCents: 1999 }],
    address,
    brand,
    currency: "USD",
  };
  it("suppresses prices, invoices and inserts and brands the slip", () => {
    const payload = buildSupplierPayload({ ...base, blind: true, international: false });
    assert.equal(payload.packing_slip.show_prices, false);
    assert.equal(payload.packing_slip.include_supplier_invoice, false);
    assert.equal(payload.packing_slip.from_name, "PawNest");
    assert.equal(payload.customs, undefined);
    assert.ok(!JSON.stringify(payload.items).includes("1999"));
  });
  it("adds a customs declaration only for international parcels", () => {
    const payload = buildSupplierPayload({ ...base, blind: true, international: true });
    assert.equal(payload.customs?.items[0].declared_unit_value_cents, 1999);
    assert.equal(payload.packing_slip.show_prices, false);
  });
  it("never leaks supplier identity or cost into the customer view", () => {
    const view = toCustomerShipmentView({
      status: "shipped", carrier: "DHL", trackingNumber: "T1", shippedAt: null, deliveredAt: null,
      items: [{ title: "Collar", quantity: 1, supplierSku: "SECRET" } as never],
      supplierName: "Alpha Wholesale", totalCostCents: 840, externalPoId: "X-9",
    });
    const json = JSON.stringify(view);
    for (const secret of ["Alpha", "840", "X-9", "SECRET"]) assert.ok(!json.includes(secret), secret);
  });
});
