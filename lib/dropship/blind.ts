/**
 * Blind / discreet dropshipping. Anything sent to a supplier must identify
 * the shipment as coming from our brand, never expose what the customer paid,
 * and never expose a supplier invoice to the customer.
 */

export interface ShippingAddress {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export interface BrandIdentity {
  name: string;
  /** Where returns and "return to sender" parcels should go. */
  returnAddress: Omit<ShippingAddress, "name" | "phone"> & { name?: string };
  supportEmail: string;
}

export interface SupplierPayloadLine {
  supplierSku: string;
  quantity: number;
  /** Sale price per unit in cents; only used for customs, never on slips. */
  unitPriceCents: number;
}

export interface SupplierPayloadInput {
  /** Our PO reference, safe to share with the supplier. */
  reference: string;
  idempotencyKey: string;
  lines: SupplierPayloadLine[];
  address: ShippingAddress;
  blind: boolean;
  brand: BrandIdentity;
  currency: string;
  /** International parcels need a declared value for customs. */
  international: boolean;
}

export interface SupplierShipmentPayload {
  reference: string;
  idempotencyKey: string;
  ship_to: ShippingAddress;
  items: Array<{ sku: string; quantity: number }>;
  packing_slip: {
    from_name: string;
    return_address: BrandIdentity["returnAddress"];
    contact_email: string;
    show_prices: boolean;
    include_supplier_invoice: boolean;
    marketing_inserts: boolean;
  };
  /** Present only when a customs declaration is required. */
  customs?: {
    currency: string;
    items: Array<{ sku: string; quantity: number; declared_unit_value_cents: number }>;
  };
}

export function buildSupplierPayload(
  input: SupplierPayloadInput,
): SupplierShipmentPayload {
  const items = input.lines.map((line) => ({
    sku: line.supplierSku,
    quantity: line.quantity,
  }));

  const payload: SupplierShipmentPayload = {
    reference: input.reference,
    idempotencyKey: input.idempotencyKey,
    ship_to: input.address,
    items,
    packing_slip: {
      from_name: input.brand.name,
      return_address: input.brand.returnAddress,
      contact_email: input.brand.supportEmail,
      // Blind shipments never show prices, supplier invoices or inserts.
      show_prices: !input.blind,
      include_supplier_invoice: !input.blind,
      marketing_inserts: !input.blind,
    },
  };

  if (input.international) {
    // Customs declarations must be truthful, so this carries the amount the
    // consignee actually paid. It travels on the customs form, not the slip.
    payload.customs = {
      currency: input.currency,
      items: input.lines.map((line) => ({
        sku: line.supplierSku,
        quantity: line.quantity,
        declared_unit_value_cents: line.unitPriceCents,
      })),
    };
  }

  return payload;
}

/** What a customer (or support agent without cost access) may see of a PO. */
export interface CustomerShipmentView {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: Array<{ title: string; quantity: number }>;
}

export function toCustomerShipmentView(po: {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: Array<{ title: string; quantity: number }>;
  // Anything else on the PO (supplier, costs, external ids) is deliberately
  // not copied into the view.
  [extra: string]: unknown;
}): CustomerShipmentView {
  return {
    status: po.status,
    carrier: po.carrier,
    trackingNumber: po.trackingNumber,
    shippedAt: po.shippedAt,
    deliveredAt: po.deliveredAt,
    items: po.items.map(({ title, quantity }) => ({ title, quantity })),
  };
}
