import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import CheckoutPanel from "../../components/CheckoutPanel";

export const metadata: Metadata = { title: "Checkout | AuraFinds" };

export default function CheckoutPage() {
  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="checkout-page">
        <p className="eyebrow">ALMOST HOME</p>
        <h1>Review your order</h1>
        <CheckoutPanel />
      </section>
    </main>
  );
}
