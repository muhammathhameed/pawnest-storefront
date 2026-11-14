import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";

export const metadata = { title: "Checkout cancelled | AuraFinds" };

export default function CheckoutCancelPage() {
  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="order-success container-page">
        <div className="order-success-hero glass-card slide-up">
          <span className="checkout-result-icon" aria-hidden="true">🐾</span>
          <h1 className="t-page">Your cart is still here</h1>
          <p className="t-body text-muted">Checkout was cancelled and you haven’t been charged. Your items are saved on this device.</p>
          <div className="order-success-actions">
            <Link href="/cart" className="btn btn-primary">Return to your cart</Link>
            <Link href="/#catalog" className="btn btn-glass">Keep shopping</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
