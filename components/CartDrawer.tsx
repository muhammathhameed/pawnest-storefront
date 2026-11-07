"use client";

import { useEffect } from "react";
import { useCartStore } from "../store/cartStore";

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
  const subtotal = items.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );

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
            <p className="eyebrow">YOUR PAWNEST PICKS</p>
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
              🐾
            </span>
            <h3>Your cart is waiting</h3>
            <p>Find something lovely for your furry best friend.</p>
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
                    <img
                      className="cart-item-image"
                      src={product.image_url}
                      alt=""
                    />
                  ) : (
                    <div className="cart-item-image cart-item-placeholder">
                      🐾
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
                            updateQuantity(product.id, quantity - 1)
                          }
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          &minus;
                        </button>
                        <span aria-live="polite">{quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(product.id, quantity + 1)
                          }
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removeItem(product.id)}
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
              <button
                type="button"
                className="clear-cart-button"
                onClick={clearCart}
              >
                Clear cart
              </button>
              <div className="subtotal-row">
                <span>Subtotal</span>
                <strong>{currency.format(subtotal)}</strong>
              </div>
              <p className="cart-note">
                Shipping and taxes are calculated at checkout. Checkout
                integration is not configured yet.
              </p>
              <button
                type="button"
                className="primary-button checkout-button"
                disabled
                title="Checkout is not configured yet"
              >
                Checkout
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
