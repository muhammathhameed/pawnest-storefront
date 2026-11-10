import type { ShippingAddress } from "./blind";

interface StripeAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface StripeSessionLike {
  customer_details?: { name?: string | null; phone?: string | null } | null;
  // Newer Stripe API versions nest shipping under collected_information;
  // older ones expose shipping_details directly. Support both.
  collected_information?: {
    shipping_details?: { name?: string | null; address?: StripeAddress | null } | null;
  } | null;
  shipping_details?: { name?: string | null; address?: StripeAddress | null } | null;
}

export interface CapturedShipping {
  name: string;
  phone: string | null;
  address: ShippingAddress;
}

/** Pulls the ship-to out of a Checkout Session, or null if it is incomplete. */
export function extractShipping(
  session: StripeSessionLike,
): CapturedShipping | null {
  const details =
    session.collected_information?.shipping_details ?? session.shipping_details;
  const address = details?.address;
  const line1 = address?.line1?.trim();
  const city = address?.city?.trim();
  const postalCode = address?.postal_code?.trim();
  const country = address?.country?.trim().toUpperCase();
  if (!line1 || !city || !postalCode || !country || !/^[A-Z]{2}$/.test(country)) {
    return null;
  }

  const name = (details?.name ?? session.customer_details?.name ?? "").trim();
  if (!name) return null;
  const phone = session.customer_details?.phone?.trim() || null;

  return {
    name,
    phone,
    address: {
      name,
      phone,
      line1,
      line2: address?.line2?.trim() || null,
      city,
      state: address?.state?.trim() || null,
      postalCode,
      country,
    },
  };
}
