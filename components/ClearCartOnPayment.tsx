"use client";

import { useEffect } from "react";
import { useCartStore } from "../store/cartStore";

export default function ClearCartOnPayment() {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
