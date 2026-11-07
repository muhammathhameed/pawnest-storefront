import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSupabaseClient } from "../../../lib/supabase";
import { getStripeClient } from "../../../lib/stripe";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

interface RequestedCartItem {
  id: string | number;
  quantity: number;
}

function isRequestedCartItem(value: unknown): value is RequestedCartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;
  return (
    (typeof item.id === "string" ||
      (typeof item.id === "number" && Number.isFinite(item.id))) &&
    (typeof item.id !== "string" || item.id.trim().length > 0) &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) > 0 &&
    Number(item.quantity) <= 99
  );
}

export async function POST(request: Request) {
  let authClient: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  try {
    authClient = await getSupabaseServerClient();
  } catch (error) {
    console.error("Supabase auth is not configured for checkout:", error);
    return NextResponse.json(
      { error: "Authentication is not configured on this server." },
      { status: 500 },
    );
  }
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Could not verify checkout user:", authError.message);
    return NextResponse.json(
      { error: "Could not verify your account. Please sign in again." },
      { status: 401 },
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in before checkout." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const items = (body as { items?: unknown } | null)?.items;
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 100 ||
    !items.every(isRequestedCartItem)
  ) {
    return NextResponse.json(
      { error: "Your cart is empty or contains invalid items." },
      { status: 400 },
    );
  }

  const quantities = new Map<string, number>();
  for (const item of items) {
    const id = String(item.id);
    const quantity = (quantities.get(id) ?? 0) + item.quantity;
    if (quantity > 99) {
      return NextResponse.json(
        { error: "A product quantity cannot exceed 99." },
        { status: 400 },
      );
    }
    quantities.set(id, quantity);
  }

  let supabase: ReturnType<typeof getSupabaseClient>;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error("Supabase public credentials are not configured:", error);
    return NextResponse.json(
      { error: "The product catalog is not configured on this server." },
      { status: 500 },
    );
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, stock_quantity")
    .in("id", [...quantities.keys()]);

  if (productsError) {
    console.error("Could not load products for Stripe Checkout:", productsError);
    return NextResponse.json(
      { error: "We couldn't verify your cart. Please try again." },
      { status: 500 },
    );
  }

  if (!products || products.length !== quantities.size) {
    return NextResponse.json(
      {
        error:
          "One or more products are no longer available. Please refresh your cart.",
      },
      { status: 400 },
    );
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const product of products) {
    const price = Number(product.price);
    const unitAmount = Math.round(price * 100);
    const quantity = quantities.get(String(product.id));
    const stockQuantity = Number(product.stock_quantity);

    if (
      !product.name ||
      !Number.isFinite(price) ||
      price <= 0 ||
      unitAmount < 50 ||
      !quantity ||
      !Number.isInteger(stockQuantity) ||
      stockQuantity < quantity
    ) {
      return NextResponse.json(
        {
          error:
            "A product in your cart is unavailable or has insufficient stock.",
        },
        { status: 400 },
      );
    }

    lineItems.push({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: unitAmount,
        product_data: {
          name: product.name,
          metadata: { product_id: String(product.id) },
        },
      },
    });
  }

  try {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey || !/^pk_(test|live)_/.test(publishableKey)) {
      throw new Error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid.",
      );
    }

    const stripe = getStripeClient();
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!configuredSiteUrl && process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is required in production to create checkout return URLs.",
      );
    }

    let siteUrl: URL;
    try {
      siteUrl = new URL(configuredSiteUrl ?? new URL(request.url).origin);
    } catch {
      throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
    }
    if (
      (process.env.NODE_ENV === "production" && siteUrl.protocol !== "https:") ||
      (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:")
    ) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must use HTTPS in production and HTTP or HTTPS otherwise.",
      );
    }

    const origin = siteUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      line_items: lineItems,
      customer_email: user.email,
      metadata: {
        customer_user_id: user.id,
      },
      payment_intent_data: {
        metadata: { customer_user_id: user.id },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    if (!session.url) {
      console.error("Stripe Checkout Session did not include a hosted URL.");
      return NextResponse.json(
        { error: "We couldn't start checkout. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe Checkout Session:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't start checkout. Please try again.",
      },
      { status: 500 },
    );
  }
}
