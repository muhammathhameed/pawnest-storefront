"use client";

import { useCartStore } from "../store/cartStore";
import type { Product } from "../types/product";

export default function AddToCartButton({
  product,
}: {
  product: Product;
}) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      type="button"
      onClick={() => addItem(product)}
      className="add-to-cart-button"
      aria-label={`Add ${product.name} to cart`}
    >
      Add to cart
    </button>
  );
}