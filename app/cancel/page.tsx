import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="checkout-result-shell">
      <section className="checkout-result-card">
        <span className="checkout-result-icon" aria-hidden="true">
          🐾
        </span>
        <p className="eyebrow">PAWNEST CHECKOUT</p>
        <h1>Your cart is still here.</h1>
        <p>
          Checkout was canceled, and you haven&apos;t been charged. Your cart is
          saved so you can pick up where you left off.
        </p>
        <Link className="primary-button result-link" href="/">
          Return to your cart
        </Link>
      </section>
    </main>
  );
}
