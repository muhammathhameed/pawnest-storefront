"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "../store/cartStore";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function CheckoutPanel() {
  const items = useCartStore((state) => state.items);
  const [isLoading, setIsLoading] = useState(false);
  const subtotal = items.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );

  async function beginCheckout() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ product, quantity }) => ({
            id: product.id,
            quantity,
          })),
        }),
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.location.assign("/login?redirect=%2Fcheckout");
        return;
      }
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not start secure checkout.");
      }
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
      setIsLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="empty-products">
        <span aria-hidden="true">🐾</span>
        <h2>Your cart is empty</h2>
        <p>Add a favorite before heading to checkout.</p>
        <Link className="primary-button result-link" href="/">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-panel">
      <div className="checkout-review-list">
        {items.map(({ product, quantity }) => (
          <article className="checkout-review-item" key={product.id}>
            <div>
              <h2>{product.name}</h2>
              <p>Quantity: {quantity}</p>
            </div>
            <strong>
              {currency.format(Number(product.price) * quantity)}
            </strong>
          </article>
        ))}
      </div>
      <div className="checkout-review-total">
        <span>Estimated subtotal</span>
        <strong>{currency.format(subtotal)}</strong>
      </div>
      <p className="cart-note">
        Current prices and inventory are verified before payment. Shipping and
        taxes are calculated by Stripe.
      </p>
      <button
        className="primary-button checkout-button"
        type="button"
        disabled={isLoading}
        onClick={beginCheckout}
      >
        {isLoading ? "Connecting to Stripe..." : "Continue to secure payment"}
      </button>
    </div>
  );
}
