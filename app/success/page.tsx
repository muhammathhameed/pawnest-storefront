import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import ClearCartOnPayment from "../../components/ClearCartOnPayment";
import { getStripeClient } from "../../lib/stripe";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order confirmed | AuraFinds" };

interface Props {
  searchParams: Promise<{ session_id?: string | string[] }>;
}

const money = (cents: number | null | undefined, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format((cents ?? 0) / 100);

function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return null;
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 2))}@${domain}`;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id: raw } = await searchParams;
  const sessionId = Array.isArray(raw) ? undefined : raw;
  const validId = !!sessionId && /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId);

  let session: Awaited<ReturnType<ReturnType<typeof getStripeClient>["checkout"]["sessions"]["retrieve"]>> | null = null;
  let lines: { description: string | null; quantity: number | null; amount_total: number }[] = [];
  let loadError = false;

  if (validId) {
    try {
      const stripe = getStripeClient();
      session = await stripe.checkout.sessions.retrieve(sessionId!);
      const items = await stripe.checkout.sessions.listLineItems(sessionId!, { limit: 100 });
      lines = items.data.map((l) => ({ description: l.description, quantity: l.quantity, amount_total: l.amount_total }));
    } catch (error) {
      console.error("Could not load Stripe checkout session:", error);
      loadError = true;
    }
  }

  // The webhook writes the order row; it may arrive a few seconds after the redirect.
  let orderId: string | null = null;
  if (session && session.payment_status === "paid") {
    try {
      const { data } = await getSupabaseAdmin()
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      orderId = (data as { id: string } | null)?.id ?? null;
    } catch (error) {
      console.error("Could not look up order for session:", error);
    }
  }

  const paid = session?.payment_status === "paid";
  const reference = (orderId ?? session?.id ?? "").replace(/-/g, "").slice(-8).toUpperCase();
  const email = maskEmail(session?.customer_details?.email ?? session?.customer_email);
  const shipping = session?.total_details?.amount_shipping ?? 0;
  const tax = session?.total_details?.amount_tax ?? 0;
  const currency = session?.currency ?? "usd";

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="order-success container-page">
        {paid && <ClearCartOnPayment />}
        {session && paid ? (
          <>
            <div className="order-success-hero glass-card slide-up">
              <span className="checkout-result-icon" aria-hidden="true">✓</span>
              <p className="t-label">Order confirmed</p>
              <h1 className="t-page">Thank you for your order</h1>
              <p className="t-body text-muted">
                {email ? `We’re preparing your order. Confirmation for ${email}.` : "We’re preparing your order."}
              </p>
              <p className="t-caption">
                Order reference <strong className="font-mono text-ink">#{reference}</strong>
              </p>
              {!orderId && (
                <p className="alert alert-success">Your order is being recorded and will appear in your account within a minute.</p>
              )}
            </div>

            <div className="order-success-grid">
              <div className="glass-card">
                <h2 className="t-section">Order summary</h2>
                <ul className="order-lines">
                  {lines.map((l, i) => (
                    <li key={i}>
                      <span>{l.description ?? "Item"} <span className="text-muted">× {l.quantity ?? 1}</span></span>
                      <span>{money(l.amount_total, currency)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="cart-summary">
                  <div><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : money(shipping, currency)}</dd></div>
                  <div><dt>Tax</dt><dd>{money(tax, currency)}</dd></div>
                  <div className="cart-summary-total"><dt className="t-card">Total paid</dt><dd className="t-section">{money(session.amount_total, currency)}</dd></div>
                </dl>
              </div>

              <div className="glass-card">
                <h2 className="t-section">What’s next</h2>
                <p className="t-body text-muted">Track progress, view receipts and manage delivery from your account.</p>
                <div className="order-success-actions">
                  <Link href="/account/orders" className="btn btn-primary">View my orders</Link>
                  <Link href="/account" className="btn btn-glass">Account dashboard</Link>
                  <Link href="/#catalog" className="btn btn-glass">Continue shopping</Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="order-success-hero glass-card slide-up">
            <span className="checkout-result-icon" aria-hidden="true">{loadError ? "!" : "✦"}</span>
            <h1 className="t-page">{loadError ? "We couldn’t confirm this order" : "Checkout details unavailable"}</h1>
            <p className="t-body text-muted">
              {loadError
                ? "If you were charged, your order will appear in your account. Please don’t pay twice."
                : "This link is no longer valid. If you completed a purchase, it will appear in your account."}
            </p>
            <div className="order-success-actions">
              <Link href="/account/orders" className="btn btn-primary">View my orders</Link>
              <Link href="/#catalog" className="btn btn-glass">Back to the shop</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
