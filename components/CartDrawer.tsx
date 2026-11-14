"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_THRESHOLD_CENTS, STANDARD_SHIPPING_AMOUNT_CENTS } from "../lib/shipping";
import { useCartStore } from "../store/cartStore";
import StoreImage from "./StoreImage";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type Trending = { id: string | number; name: string; price: number; image?: string | null };

function CartIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true" className="cart-illustration">
      <defs>
        <linearGradient id="bagGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--primary-2)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="108" rx="34" ry="5" fill="var(--border)" />
      <path d="M30 44h60l-5 56a6 6 0 0 1-6 5H41a6 6 0 0 1-6-5z" fill="url(#bagGrad)" />
      <path d="M44 44V36a16 16 0 0 1 32 0v8" fill="none" stroke="var(--muted)" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 62c6 4 34 4 40 0" fill="none" stroke="var(--highlight)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [trending, setTrending] = useState<Trending[]>([]);
  // Portal target must exist on the client only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotalCents = Math.round(items.reduce((t, i) => t + Number(i.product.price) * i.quantity, 0) * 100);
  const shippingCents = items.length === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_AMOUNT_CENTS;
  const totalCents = subtotalCents + shippingCents;
  const toFree = Math.max(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents, 0);
  const progress = Math.min((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100, 100);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Trending products only when the cart is empty, fetched once.
  useEffect(() => {
    if (!isOpen || items.length > 0 || trending.length > 0) return;
    fetch("/api/concierge")
      .then((r) => r.json())
      .then((d) => setTrending((Array.isArray(d.recommendations) ? d.recommendations : []).slice(0, 3)))
      .catch(() => setTrending([]));
  }, [isOpen, items.length, trending.length]);

  async function checkout() {
    setCheckoutError(null);
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ product, quantity }) => ({ id: product.id, quantity })) }),
      });
      if (res.status === 401) {
        // Guest checkout is not supported yet. The cart is saved locally, so it survives sign-in.
        window.location.assign("/login?redirect=%2Fcheckout");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "We couldn't start checkout. Your cart is saved, please try again.");
      window.location.assign(data.url);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Network problem. Your cart is saved, please try again.");
      setIsCheckingOut(false);
    }
  }

  if (!isOpen || !mounted) return null;

  // Rendered into <body>, not inside the sticky header. The header uses
  // backdrop-filter, which makes it the containing block for position:fixed
  // descendants, so a drawer rendered there was sized to the header (~74px).
  return createPortal(
    <div className="cart-overlay">
      <button type="button" className="cart-backdrop" onClick={onClose} aria-label="Close cart" />
      <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <header className="cart-header">
          <div>
            <h2 id="cart-title" className="t-section">Shopping cart</h2>
            <p className="t-caption">{count === 0 ? "Empty" : `${count} ${count === 1 ? "item" : "items"}`}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close shopping cart">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty-state">
            <CartIllustration />
            <h3 className="t-section">Your cart is waiting</h3>
            <p className="t-caption">Find something you will love. Saved items stay here on this device.</p>
            <Link href="/#catalog" className="btn btn-primary" onClick={onClose}>Continue shopping</Link>
            {trending.length > 0 && (
              <div className="cart-trending">
                <p className="t-label">Trending now</p>
                <ul>
                  {trending.map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.id}`} onClick={onClose}>
                        <span className="cart-trending-name">{p.name}</span>
                        <span className="t-card text-brand">{currency.format(Number(p.price))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="cart-shipping-banner" aria-live="polite">
              <p className="t-caption">
                {toFree > 0 ? `Add ${currency.format(toFree / 100)} more for free shipping` : "You unlocked free shipping"}
              </p>
              <div className="shipping-progress-track" role="progressbar" aria-label="Free shipping progress"
                aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD_CENTS} aria-valuenow={Math.min(subtotalCents, FREE_SHIPPING_THRESHOLD_CENTS)}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>

            <ul className="cart-items">
              {items.map(({ product, quantity }) => {
                const max = Math.min(product.stock_quantity, 99);
                return (
                  <li className="cart-item" key={product.id}>
                    {product.image_url ? (
                      <StoreImage className="cart-item-image" src={product.image_url} alt="" />
                    ) : (
                      <div className="cart-item-image cart-item-placeholder" aria-hidden="true">✦</div>
                    )}
                    <div className="cart-item-details">
                      <div className="cart-item-heading">
                        <h3 className="t-card">{product.name}</h3>
                        {product.category && <p className="cart-item-category">{product.category}</p>}
                        <p className="t-caption">{currency.format(Number(product.price))} each</p>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-control" role="group" aria-label={`Quantity for ${product.name}`}>
                          <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}>&minus;</button>
                          <span aria-live="polite">{quantity}</span>
                          <button type="button" disabled={quantity >= max} onClick={() => updateQuantity(product.id, quantity + 1)} aria-label={`Increase ${product.name} quantity`}>+</button>
                        </div>
                        <strong className="t-card">{currency.format(Number(product.price) * quantity)}</strong>
                      </div>
                      <button type="button" className="remove-button" onClick={() => { removeItem(product.id); toast.success(`${product.name} removed.`); }}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <footer className="cart-footer">
              <dl className="cart-summary">
                <div><dt>Subtotal</dt><dd>{currency.format(subtotalCents / 100)}</dd></div>
                <div><dt>Shipping</dt><dd>{shippingCents === 0 ? "Free" : currency.format(shippingCents / 100)}</dd></div>
                <div><dt>Discounts</dt><dd>None applied</dd></div>
                <div><dt>Taxes</dt><dd>Calculated at checkout</dd></div>
                <div className="cart-summary-total"><dt className="t-card">Estimated total</dt><dd className="t-section">{currency.format(totalCents / 100)}</dd></div>
              </dl>
              {checkoutError && <p className="alert alert-danger" role="alert">{checkoutError}</p>}
              <button type="button" className="btn btn-primary cart-checkout" disabled={isCheckingOut} onClick={checkout}>
                {isCheckingOut ? "Connecting to Stripe…" : "Checkout securely"}
              </button>
              <div className="cart-secondary">
                <button type="button" className="btn btn-glass btn-sm" onClick={onClose}>Continue shopping</button>
                <Link href="/cart" className="btn btn-glass btn-sm" onClick={onClose}>View full cart</Link>
              </div>
              <button type="button" className="remove-button cart-clear" onClick={() => { clearCart(); toast.success("Your cart has been cleared."); }}>
                Clear cart
              </button>
            </footer>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
