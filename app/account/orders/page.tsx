import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function AccountOrdersPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=%2Faccount%2Forders");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, stripe_session_id, total_amount, payment_status, created_at")
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load customer orders:", error);
  }

  const orderIds = (orders ?? []).map((order) => String(order.id));
  const { data: orderItems, error: itemError } =
    orderIds.length > 0
      ? await supabase
          .from("order_items")
          .select("order_id, product_id, quantity, unit_price")
          .in("order_id", orderIds)
      : { data: [], error: null };

  if (itemError) console.error("Could not load customer order items:", itemError);

  const productIds = [
    ...new Set((orderItems ?? []).map((item) => String(item.product_id))),
  ];
  const { data: products, error: productError } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, name, image_url")
          .in("id", productIds)
      : { data: [], error: null };

  if (productError) {
    console.error("Could not load order product details:", productError);
  }

  const productNames = new Map(
    (products ?? []).map((product) => [String(product.id), product.name]),
  );
  const itemsByOrder = new Map<string, typeof orderItems>();
  for (const item of orderItems ?? []) {
    const key = String(item.order_id);
    itemsByOrder.set(key, [...(itemsByOrder.get(key) ?? []), item]);
  }

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="orders-page">
        <Link className="back-link" href="/account">
          &larr; My account
        </Link>
        <p className="eyebrow">YOUR PAWNEST</p>
        <h1>Order history</h1>

        {error ? (
          <div className="store-error" role="alert">
            <h2>We couldn&apos;t load your orders</h2>
            <p>Please refresh the page to try again.</p>
          </div>
        ) : !orders?.length ? (
          <div className="empty-products">
            <span aria-hidden="true">📦</span>
            <h2>No orders just yet</h2>
            <p>Your orders will appear here after checkout.</p>
            <Link className="primary-button result-link" href="/">
              Explore the shop
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const items = itemsByOrder.get(String(order.id)) ?? [];
              return (
                <article className="order-card" key={order.id}>
                  <header className="order-card-header">
                    <div>
                      <p className="eyebrow">ORDER PLACED</p>
                      <h2>
                        {new Date(order.created_at).toLocaleDateString(
                          "en-US",
                          { dateStyle: "long" },
                        )}
                      </h2>
                    </div>
                    <span className="order-status">
                      {(order.payment_status ?? "pending").replaceAll("_", " ")}
                    </span>
                  </header>
                  <div className="order-card-items">
                    {items.map((item, index) => (
                      <div
                        className="order-item-row"
                        key={`${order.id}-${item.product_id}-${index}`}
                      >
                        <span>
                          {productNames.get(String(item.product_id)) ??
                            "PawNest product"}{" "}
                          &times; {item.quantity}
                        </span>
                        <strong>
                          {currency.format(
                            Number(item.unit_price) * item.quantity,
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <footer className="order-card-footer">
                    <span>Order total</span>
                    <strong>
                      {currency.format(Number(order.total_amount) / 100)}
                    </strong>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
