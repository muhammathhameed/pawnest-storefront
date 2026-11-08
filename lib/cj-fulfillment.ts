import "server-only";
import {
  CJDropshippingError,
  createCJOrder,
  type CJOrderData,
} from "./cj-dropshipping";
import { getSupabaseAdmin } from "./supabaseAdmin";

interface OrderRow {
  id: string;
  customer_email: string | null;
  payment_status: string;
  shipping_details: unknown;
  cj_order_id: string | null;
  fulfillment_status: string;
}

interface AddressRecord {
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
  country?: unknown;
}

interface ShippingRecord {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
}

export class FulfillmentError extends Error {
  readonly status: number;
  readonly lowBalance: boolean;

  constructor(
    message: string,
    status = 400,
    lowBalance = false,
  ) {
    super(message);
    this.name = "FulfillmentError";
    this.status = status;
    this.lowBalance = lowBalance;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function countryName(countryCode: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ??
      countryCode
    );
  } catch {
    return countryCode;
  }
}

function createOrderPayload(
  order: OrderRow,
  items: Array<{ product_id: string; quantity: number }>,
  products: Array<{ product_id: string; cj_variant_id: string }>,
): CJOrderData {
  if (!isRecord(order.shipping_details)) {
    throw new FulfillmentError(
      "Order is missing shipping details required for fulfillment.",
    );
  }
  const shipping = order.shipping_details as ShippingRecord;
  if (!isRecord(shipping.address)) {
    throw new FulfillmentError(
      "Order is missing a complete shipping address.",
    );
  }
  const address = shipping.address as AddressRecord;
  const name = stringValue(shipping.name);
  const email = stringValue(order.customer_email);
  const address1 = stringValue(address.line1);
  const city = stringValue(address.city);
  const province = stringValue(address.state);
  const countryCode = stringValue(address.country)?.toUpperCase();
  if (
    !name ||
    !email ||
    !address1 ||
    !city ||
    !province ||
    !countryCode ||
    !/^[A-Z]{2}$/.test(countryCode)
  ) {
    throw new FulfillmentError(
      "Order is missing recipient, email, street, city, state, or country details.",
    );
  }

  const productById = new Map(
    products.map((product) => [product.product_id, product]),
  );
  const cjItems = items.map((item) => {
    const product = productById.get(item.product_id);
    if (!product?.cj_variant_id) {
      throw new FulfillmentError(
        "A product in this order is not mapped to a CJ variant. Add its private CJ variant mapping before retrying.",
      );
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new FulfillmentError("Order contains an invalid item quantity.");
    }
    return { variantId: product.cj_variant_id, quantity: item.quantity };
  });

  return {
    orderNumber: `AF-${order.id}`,
    shippingAddress: {
      name,
      email,
      phone: stringValue(shipping.phone),
      address1,
      address2: stringValue(address.line2),
      city,
      province,
      countryCode,
      country: countryName(countryCode),
      postalCode: stringValue(address.postal_code),
    },
    items: cjItems,
  };
}

export async function submitCJFulfillment(orderId: string) {
  const supabase = getSupabaseAdmin();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, customer_email, payment_status, shipping_details, cj_order_id, fulfillment_status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Could not load order for CJ fulfillment:", orderError);
    throw new FulfillmentError("Could not load order for fulfillment.", 500);
  }
  if (!order) throw new FulfillmentError("Order not found.", 404);
  const typedOrder: OrderRow = order;

  if (typedOrder.cj_order_id) {
    return {
      orderId,
      cjOrderId: typedOrder.cj_order_id,
      status: typedOrder.fulfillment_status,
      duplicate: true,
    };
  }
  if (typedOrder.payment_status !== "paid") {
    throw new FulfillmentError(
      "Only paid orders can be sent to CJ Dropshipping.",
      409,
    );
  }
  if (
    typedOrder.fulfillment_status !== "pending" &&
    typedOrder.fulfillment_status !== "failed"
  ) {
    return {
      orderId,
      cjOrderId: null,
      status: typedOrder.fulfillment_status,
      duplicate: true,
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  if (itemsError) {
    console.error("Could not load order items for CJ fulfillment:", itemsError);
    throw new FulfillmentError("Could not load order items.", 500);
  }
  if (!items?.length) {
    throw new FulfillmentError("Order does not contain any items.", 409);
  }

  const productIds = [...new Set(items.map((item) => String(item.product_id)))];
  const { data: products, error: productsError } = await supabase
    .from("product_cj_variants")
    .select("product_id, cj_variant_id")
    .in("product_id", productIds);
  if (productsError) {
    console.error("Could not load CJ product mappings:", productsError);
    throw new FulfillmentError("Could not load CJ product mappings.", 500);
  }
  if (typedOrder.id.length > 47) {
    throw new FulfillmentError(
      "Order ID is too long to create a stable CJ order number.",
      409,
    );
  }
  const orderData = createOrderPayload(
    typedOrder,
    items,
    (products ?? []).map((product) => ({
      product_id: String(product.product_id),
      cj_variant_id: product.cj_variant_id,
    })),
  );

  const { data: claimedOrder, error: claimError } = await supabase
    .from("orders")
    .update({
      fulfillment_status: "submitting",
      fulfillment_error: null,
    })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    .in("fulfillment_status", ["pending", "failed"])
    .is("cj_order_id", null)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("Could not claim order for CJ fulfillment:", claimError);
    throw new FulfillmentError("Could not start order fulfillment.", 500);
  }
  if (!claimedOrder) {
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from("orders")
      .select("cj_order_id, fulfillment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (currentOrderError) {
      console.error("Could not inspect CJ fulfillment state:", currentOrderError);
      throw new FulfillmentError("Could not confirm fulfillment state.", 500);
    }
    return {
      orderId,
      cjOrderId: currentOrder?.cj_order_id ?? null,
      status: currentOrder?.fulfillment_status ?? "unknown",
      duplicate: true,
    };
  }

  try {
    const { cjOrderId } = await createCJOrder(orderData);
    const { error: saveError } = await supabase
      .from("orders")
      .update({
        cj_order_id: cjOrderId,
        fulfillment_status: "processing",
        fulfillment_error: null,
        fulfillment_submitted_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .is("cj_order_id", null);

    if (saveError) {
      console.error(
        "CJ accepted an order but its ID could not be saved:",
        saveError,
      );
      throw new FulfillmentError(
        "CJ accepted the order, but its reference could not be saved. Manual reconciliation is required.",
        500,
      );
    }
    return { orderId, cjOrderId, status: "processing", duplicate: false };
  } catch (error) {
    if (error instanceof FulfillmentError) throw error;

    const outcomeUnknown =
      error instanceof CJDropshippingError && error.outcomeUnknown;
    if (outcomeUnknown) {
      const safeMessage =
        "CJ submission outcome is unknown. Reconcile this order in CJ before retrying.";
      const { error: updateError } = await supabase
        .from("orders")
        .update({ fulfillment_error: safeMessage })
        .eq("id", orderId)
        .eq("fulfillment_status", "submitting")
        .is("cj_order_id", null);
      if (updateError) {
        console.error(
          "Could not record an inconclusive CJ submission:",
          updateError,
        );
      }
      console.error("CJ order submission outcome is unknown:", {
        orderId,
        code: error.code,
      });
      throw new FulfillmentError(safeMessage, 502);
    }

    const lowBalance =
      error instanceof CJDropshippingError && error.lowBalance;
    const safeMessage = lowBalance
      ? "CJ account balance may be insufficient. Add balance in CJ and retry fulfillment."
      : "CJ could not accept this order. Check CJ configuration and retry fulfillment.";
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        fulfillment_status: "failed",
        fulfillment_error: safeMessage,
      })
      .eq("id", orderId)
      .is("cj_order_id", null);
    if (updateError) {
      console.error("Could not record failed CJ fulfillment:", updateError);
    }
    if (error instanceof CJDropshippingError) {
      console.error("CJ order submission failed:", {
        code: error.code,
        lowBalance,
      });
    } else {
      console.error("CJ order submission failed with an unexpected error.");
    }
    throw new FulfillmentError(safeMessage, 502, lowBalance);
  }
}

export async function getActiveCJOrders(limit = 25) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("id, cj_order_id")
    .eq("fulfillment_status", "processing")
    .not("cj_order_id", "is", null)
    .order("tracking_last_checked_at", {
      ascending: true,
      nullsFirst: true,
    })
    .limit(limit);
  if (error) {
    console.error("Could not load orders for CJ tracking:", error);
    throw new FulfillmentError("Could not load orders for tracking.", 500);
  }
  return (data ?? []).filter(
    (order): order is { id: string; cj_order_id: string } =>
      typeof order.cj_order_id === "string" && order.cj_order_id.length > 0,
  );
}
