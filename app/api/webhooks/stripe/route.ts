import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

interface OrderItemPayload {
  product_id: string;
  quantity: number;
  unit_price: number;
}

async function saveWebhookAudit(
  event: Stripe.Event,
  status: "failed" | "ignored",
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("record_stripe_webhook_audit", {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_status: status,
  });

  if (error) {
    console.error("Could not save Stripe webhook audit event:", error);
    throw error;
  }
}

async function getOrderItems(
  session: Stripe.Checkout.Session,
): Promise<OrderItemPayload[]> {
  const stripe = getStripeClient();
  const { data: lineItems, has_more: hasMore } =
    await stripe.checkout.sessions.listLineItems(
    session.id,
    { limit: 100, expand: ["data.price.product"] },
  );

  if (lineItems.length === 0 || hasMore) {
    throw new Error(
      "Checkout Session has no items or exceeds the supported item limit",
    );
  }

  return lineItems.map((lineItem) => {
    const product = lineItem.price?.product;
    const productId =
      typeof product === "object" && !("deleted" in product)
        ? product.metadata.product_id
        : undefined;
    const unitAmount = lineItem.price?.unit_amount;

    if (
      !productId ||
      !Number.isInteger(lineItem.quantity) ||
      !lineItem.quantity ||
      !Number.isInteger(unitAmount) ||
      unitAmount === null ||
      unitAmount < 0 ||
      lineItem.currency !== "usd"
    ) {
      throw new Error(
        "Stripe Checkout Session contains invalid product details",
      );
    }

    return {
      product_id: productId,
      quantity: lineItem.quantity,
      unit_price: unitAmount / 100,
    };
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let stripe: ReturnType<typeof getStripeClient>;
  try {
    stripe = getStripeClient();
  } catch (error) {
    console.error("Stripe API credentials are invalid:", error);
    return NextResponse.json(
      { error: "Webhook endpoint is not configured." },
      { status: 500 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    console.error("STRIPE_WEBHOOK_SECRET is missing or invalid.");
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is missing or invalid; provide the signing secret for this webhook endpoint.",
      },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Invalid Stripe webhook signature: ${error.message}`
            : "Invalid Stripe webhook signature.",
      },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    console.error("Supabase webhook credentials are not configured:", error);
    return NextResponse.json(
      { error: "Webhook endpoint is not configured." },
      { status: 500 },
    );
  }

  const { data: existingEvent, error: lookupError } = await supabase
    .from("webhook_events")
    .select("status")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Could not check Stripe webhook event:", lookupError);
    return NextResponse.json(
      { error: "Could not process webhook event." },
      { status: 500 },
    );
  }
  if (
    existingEvent?.status === "ignored" ||
    existingEvent?.status === "processed"
  ) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const isCheckoutEvent = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
  ].includes(event.type);

  if (!isCheckoutEvent) {
    try {
      await saveWebhookAudit(event, "ignored");
    } catch {
      return NextResponse.json(
        { error: "Could not save webhook audit event." },
        { status: 500 },
      );
    }
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (
    event.type === "checkout.session.async_payment_failed" ||
    session.payment_status !== "paid"
  ) {
    try {
      await saveWebhookAudit(event, "ignored");
    } catch (error) {
      console.error("Could not audit unpaid Stripe Checkout Session:", error);
      return NextResponse.json(
        { error: "Could not save webhook audit event." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "Payment is not complete.",
    });
  }

  if (
    session.mode !== "payment" ||
    session.amount_total === null ||
    !session.currency ||
    session.currency !== "usd"
  ) {
    console.error("Stripe Checkout Session is missing valid payment details.");
    try {
      await saveWebhookAudit(event, "failed");
    } catch {
      return NextResponse.json(
        { error: "Could not save webhook audit event." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Checkout Session is missing required payment details." },
      { status: 400 },
    );
  }

  try {
    const orderItems = await getOrderItems(session);
    const email =
      session.customer_details?.email ?? session.customer_email ?? null;
    const { data, error } = await supabase.rpc(
      "process_stripe_checkout_order",
      {
        p_stripe_event_id: event.id,
        p_event_type: event.type,
        p_stripe_session_id: session.id,
        p_customer_email: email,
        p_customer_user_id:
          session.metadata?.customer_user_id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            session.metadata.customer_user_id,
          )
            ? session.metadata.customer_user_id
            : null,
        p_total_amount: session.amount_total,
        p_payment_status: session.payment_status,
        p_currency: session.currency,
        p_items: orderItems,
      },
    );

    if (error) throw error;

    const result =
      data && typeof data === "object" && !Array.isArray(data) ? data : null;
    return NextResponse.json({
      received: true,
      duplicate: result?.duplicate === true,
      orderId:
        typeof result?.order_id === "string" ? result.order_id : null,
    });
  } catch (error) {
    console.error("Could not persist Stripe Checkout order:", error);

    try {
      await saveWebhookAudit(event, "failed");
    } catch (auditError) {
      console.error("Could not record failed Stripe webhook event:", auditError);
    }

    return NextResponse.json(
      { error: "Could not persist order. Stripe should retry this event." },
      { status: 500 },
    );
  }
}
