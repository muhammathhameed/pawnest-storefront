"use client";

import { useCartStore } from "../store/cartStore";

export default function AddToCartButton({
  product,
}: {
  product: any;
}) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      onClick={() => addItem(product)}
      className="bg-purple-600 text-white px-4 py-2 rounded-lg"
    >
      Add to Cart
    </button>
  );
}