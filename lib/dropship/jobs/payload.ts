import "server-only";
import { buildSupplierPayload, type ShippingAddress, type SupplierShipmentPayload } from "../blind";
import { getBrandIdentity } from "../config";

export function buildSupplierPayloadFor(args: {
  poId: string;
  idempotencyKey: string;
  address: ShippingAddress;
  blind: boolean;
  currency: string;
  shipsFromCountry: string | null;
  lines: Array<{ supplierSku: string; quantity: number; unitPriceCents: number }>;
}): SupplierShipmentPayload {
  return buildSupplierPayload({
    reference: args.poId,
    idempotencyKey: args.idempotencyKey,
    lines: args.lines,
    address: args.address,
    blind: args.blind,
    brand: getBrandIdentity(),
    currency: args.currency,
    international:
      !!args.shipsFromCountry && args.shipsFromCountry !== args.address.country,
  });
}
