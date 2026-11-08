"use client";

import Link from "next/link";
import { toast } from "sonner";
import SiteHeader from "../../components/SiteHeader";
import StoreImage from "../../components/StoreImage";
import {
  FREE_SHIPPING_THRESHOLD,
  FREE_SHIPPING_THRESHOLD_CENTS,
} from "../../lib/shipping";
import { useCartStore } from "../../store/cartStore";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = items.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="cart-page">
        <p className="eyebrow">YOUR AURAFINDS FINDS</p>
        <h1>Your shopping cart</h1>
        {items.length === 0 ? (
          <div className="empty-products">
            <span aria-hidden="true">✦</span>
            <h2>Your cart is waiting</h2>
            <p>Find something lovely for your everyday.</p>
            <Link className="primary-button result-link" href="/">
              Explore the shop
            </Link>
          </div>
        ) : (
          <div className="cart-page-grid">
            <div className="cart-page-items">
              {items.map(({ product, quantity }) => (
                <article className="cart-page-item" key={product.id}>
                  {product.image_url && (
                    <StoreImage
                      src={product.image_url}
                      alt={product.name}
                      sizes="120px"
                    />
                  )}
                  <div className="cart-page-item-main">
                    <Link href={`/products/${product.id}`}>{product.name}</Link>
                    <span>{currency.format(Number(product.price))} each</span>
                    <div className="cart-item-controls">
                      <div className="quantity-control">
                        <button
                          type="button"
                          aria-label={`Decrease ${product.name} quantity`}
                          onClick={() =>
                            {
                              updateQuantity(product.id, quantity - 1);
                              toast.success("Cart quantity updated.");
                            }}
                        >
                          &minus;
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${product.name} quantity`}
                          disabled={quantity >= product.stock_quantity}
                          onClick={() => {
                            updateQuantity(product.id, quantity + 1);
                            toast.success("Cart quantity updated.");
                          }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="remove-button"
                        type="button"
                        onClick={() => {
                          removeItem(product.id);
                          toast.success(
                            `${product.name} removed from your cart.`,
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong className="cart-page-line-total">
                    {currency.format(Number(product.price) * quantity)}
                  </strong>
                </article>
              ))}
            </div>
            <aside className="cart-page-summary">
              <h2>Order summary</h2>
              <div>
                <span>Subtotal</span>
                <strong>{currency.format(subtotal)}</strong>
              </div>
              <div className="shipping-progress cart-shipping-progress">
                <p aria-live="polite">
                  {subtotal >= FREE_SHIPPING_THRESHOLD
                    ? "You unlocked free shipping"
                    : `Add ${currency.format(FREE_SHIPPING_THRESHOLD - subtotal)} for free shipping`}
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
                  <span
                    style={{
                      width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <p>
                US shipping is $5.95 under $75 and free at $75+. Applicable
                taxes are not included.
              </p>
              <Link className="primary-button checkout-button" href="/checkout">
                Continue to checkout
              </Link>
              <Link className="cart-continue-shopping" href="/">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
