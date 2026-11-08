import { NextResponse } from "next/server";
import { getCJOrderTracking } from "../../../../lib/cj-dropshipping";
import {
  getActiveCJOrders,
  FulfillmentError,
} from "../../../../lib/cj-fulfillment";
import {
  hasValidBearerSecret,
  isSecretConfigured,
} from "../../../../lib/api-secret";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isSecretConfigured("CRON_SECRET")) {
    return NextResponse.json(
      { error: "CJ tracking endpoint is not configured." },
      { status: 500 },
    );
  }
  if (!hasValidBearerSecret(request, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let orders: Awaited<ReturnType<typeof getActiveCJOrders>>;
  try {
    orders = await getActiveCJOrders(4);
  } catch (error) {
    if (error instanceof FulfillmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not prepare CJ tracking synchronization.");
    return NextResponse.json(
      { error: "Could not load orders for tracking." },
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdmin();
  let updated = 0;
  const errors: string[] = [];

  for (const order of orders) {
    const checkedAt = new Date().toISOString();
    try {
      const tracking = await getCJOrderTracking(order.cj_order_id);
      if (!tracking.trackingNumber) {
        const { error } = await supabase
          .from("orders")
          .update({ tracking_last_checked_at: checkedAt })
          .eq("id", order.id)
          .eq("fulfillment_status", "processing")
          .eq("cj_order_id", order.cj_order_id);
        if (error) {
          console.error("Could not save CJ tracking poll time:", error);
          errors.push(order.id);
        }
        continue;
      }

      const trackingUrl = `https://www.17track.net/en#nums=${encodeURIComponent(
        tracking.trackingNumber,
      )}`;
      const { error } = await supabase
        .from("orders")
        .update({
          fulfillment_status: "shipped",
          tracking_number: tracking.trackingNumber,
          tracking_carrier: tracking.carrier,
          tracking_url: trackingUrl,
          tracking_last_checked_at: checkedAt,
          shipped_at: new Date().toISOString(),
          fulfillment_error: null,
        })
        .eq("id", order.id)
        .eq("fulfillment_status", "processing")
        .eq("cj_order_id", order.cj_order_id);

      if (error) {
        console.error("Could not save CJ tracking details:", error);
        errors.push(order.id);
      } else {
        updated += 1;
      }
    } catch (error) {
      console.error("CJ tracking lookup failed for an order:", {
        orderId: order.id,
        code:
          error instanceof Error && "code" in error
            ? error.code
            : undefined,
      });
      const { error: updateError } = await supabase
        .from("orders")
        .update({ tracking_last_checked_at: checkedAt })
        .eq("id", order.id)
        .eq("fulfillment_status", "processing")
        .eq("cj_order_id", order.cj_order_id);
      if (updateError) {
        console.error("Could not save CJ tracking retry time:", updateError);
      }
      errors.push(order.id);
    }
  }

  return NextResponse.json({
    checked: orders.length,
    updated,
    failed: errors.length,
    failedOrderIds: errors,
  });
}
