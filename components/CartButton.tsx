"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "../store/cartStore";
import CartDrawer from "./CartDrawer";

export default function CartButton() {
  const items = useCartStore((state) => state.items);
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <>
      <button
        type="button"
        className="cart-button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">🛍️</span>
        <span>Cart</span>
        <span
          className="cart-count"
          aria-label={`${hasMounted ? itemCount : 0} items in cart`}
        >
          {hasMounted ? itemCount : 0}
        </span>
      </button>
      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}