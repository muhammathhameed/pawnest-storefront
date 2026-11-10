import Link from "next/link";
import ClearCartOnPayment from "../../components/ClearCartOnPayment";
import { getStripeClient } from "../../lib/stripe";

export const dynamic = "force-dynamic";

interface CheckoutSuccessPageProps {
  searchParams: Promise<{ session_id?: string | string[] }>;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const checkoutSessionId = Array.isArray(sessionId) ? undefined : sessionId;
  let session: Awaited<
    ReturnType<ReturnType<typeof getStripeClient>["checkout"]["sessions"]["retrieve"]>
  > | null = null;
  let loadError = false;

  if (checkoutSessionId && /^cs_(test|live)_[A-Za-z0-9]+$/.test(checkoutSessionId)) {
    try {
      session = await getStripeClient().checkout.sessions.retrieve(
        checkoutSessionId,
      );
    } catch (error) {
      console.error("Could not retrieve Stripe Checkout Session:", error);
      loadError = true;
    }
  }

  const email =
    session?.customer_details?.email ?? session?.customer_email ?? null;
  const amount = session?.amount_total;
  const currency = session?.currency;
  const paymentStatus = session?.payment_status;
  const hasValidSession = Boolean(session && amount !== null && currency);

  return (
    <main className="checkout-result-shell">
      <section className="checkout-result-card">
        <span className="checkout-result-icon" aria-hidden="true">
          {paymentStatus === "paid" ? "🎉" : "✦"}
        </span>
        <p className="eyebrow">AURAFINDS CHECKOUT</p>
        {hasValidSession ? (
          <>
            {paymentStatus === "paid" && <ClearCartOnPayment />}
            <h1>
              {paymentStatus === "paid"
                ? "Thank you for your order!"
                : "Your payment is processing"}
            </h1>
            <p>
              {paymentStatus === "paid"
                ? "Your payment was received securely."
                : "Your checkout session was received. Payment confirmation may take a little longer."}
            </p>
            <dl className="checkout-summary">
              <div>
                <dt>Payment status</dt>
                <dd>{paymentStatus?.replaceAll("_", " ") ?? "unknown"}</dd>
              </div>
              {email && (
                <div>
                  <dt>Confirmation email</dt>
                  <dd>{email}</dd>
                </div>
              )}
              {amount !== null && currency && (
                <div>
                  <dt>Total</dt>
                  <dd>{formatAmount(amount, currency)}</dd>
                </div>
              )}
              <div>
                <dt>Order reference</dt>
                <dd>{checkoutSessionId}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <h1>
              {loadError
                ? "We couldn't confirm your order."
                : "Checkout details unavailable"}
            </h1>
            <p>
              {loadError
                ? "Your payment may still have gone through. Check your email for a Stripe receipt or contact us before trying again."
                : "We couldn't find a valid checkout session. Check your email for a Stripe receipt or return to the shop."}
            </p>
          </>
        )}
        <Link className="primary-button result-link" href="/">
          Back to the shop
        </Link>
      </section>
    </main>
  );
}
