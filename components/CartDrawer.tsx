"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FREE_SHIPPING_THRESHOLD,
  FREE_SHIPPING_THRESHOLD_CENTS,
} from "../lib/shipping";
import { useCartStore } from "../store/cartStore";
import StoreImage from "./StoreImage";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const subtotal = items.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const freeShippingProgress = Math.min(
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
    100,
  );

  async function handleCheckout() {
    setCheckoutError(null);
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setCheckoutError(
        "Checkout is not configured. Please set the Stripe publishable key.",
      );
      return;
    }

    setIsCheckingOut(true);
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
        throw new Error(result.error ?? "We couldn't start checkout.");
      }

      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "We couldn't start checkout. Please try again.",
      );
      setIsCheckingOut(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cart-overlay">
      <button
        type="button"
        className="cart-backdrop"
        onClick={onClose}
        aria-label="Close cart"
      />
      <section
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        <header className="cart-header">
          <div>
            <p className="eyebrow">YOUR AURAFINDS FINDS</p>
            <h2 id="cart-title">Shopping cart</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close shopping cart"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="empty-cart-icon" aria-hidden="true">
              ✦
            </span>
            <h3>Your cart is waiting</h3>
            <p>Find something lovely for your everyday.</p>
            <button type="button" className="primary-button" onClick={onClose}>
              Explore the shop
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(({ product, quantity }) => (
                <article className="cart-item" key={product.id}>
                  {product.image_url ? (
                    <StoreImage
                      className="cart-item-image"
                      src={product.image_url}
                      alt=""
                    />
                  ) : (
                    <div className="cart-item-image cart-item-placeholder">
                      ✦
                    </div>
                  )}
                  <div className="cart-item-details">
                    <div className="cart-item-heading">
                      <div>
                        <h3>{product.name}</h3>
                        {product.category && (
                          <p className="cart-item-category">
                            {product.category}
                          </p>
                        )}
                      </div>
                      <strong>
                        {currency.format(Number(product.price) * quantity)}
                      </strong>
                    </div>
                    <div className="cart-item-controls">
                      <div
                        className="quantity-control"
                        aria-label={`Quantity for ${product.name}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            {
                              updateQuantity(product.id, quantity - 1);
                              toast.success("Cart quantity updated.");
                            }}
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          &minus;
                        </button>
                        <span aria-live="polite">{quantity}</span>
                        <button
                          type="button"
                          disabled={quantity >= product.stock_quantity}
                          onClick={() => {
                            updateQuantity(product.id, quantity + 1);
                            toast.success("Cart quantity updated.");
                          }}
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => {
                          removeItem(product.id);
                          toast.success(
                            `${product.name} removed from your cart.`,
                          );
                        }}
                        aria-label={`Remove ${product.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <footer className="cart-footer">
              <div className="shipping-progress">
                <p aria-live="polite">
                  {amountToFreeShipping > 0
                    ? `You’re ${currency.format(amountToFreeShipping)} away from free shipping`
                    : "You unlocked free shipping"}
                </p>
                <div
                  className="shipping-progress-track"
                  role="progressbar"
                  aria-label="Free shipping progress"
                  aria-valuemin={0}
                  aria-valuemax={FREE_SHIPPING_THRESHOLD_CENTS}
                  aria-valuenow={Math.min(
                    subtotal * 100,
                    FREE_SHIPPING_THRESHOLD_CENTS,
                  )}
                >
                  <span style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
              <button
                type="button"
                className="clear-cart-button"
                onClick={() => {
                  clearCart();
                  toast.success("Your cart has been cleared.");
                }}
              >
                Clear cart
              </button>
              <div className="subtotal-row">
                <span>Subtotal</span>
                <strong>{currency.format(subtotal)}</strong>
              </div>
              <a className="cart-view-link" href="/cart">
                View full cart
              </a>
              <p className="cart-note">
                US shipping is $5.95 under $75 and free at $75+. Applicable
                taxes are not included.
              </p>
              {checkoutError && (
                <p className="checkout-error" role="alert">
                  {checkoutError}
                </p>
              )}
              <button
                type="button"
                className="primary-button checkout-button"
                disabled={isCheckingOut || items.length === 0}
                onClick={handleCheckout}
              >
                {isCheckingOut ? "Connecting to Stripe..." : "Checkout securely"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
