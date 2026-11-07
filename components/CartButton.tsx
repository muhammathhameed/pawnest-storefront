"use client";

import { useCartStore } from "../store/cartStore";

export default function CartButton() {
  const items = useCartStore((state) => state.items);

  return (
    <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
      Cart ({items.length})
    </button>
  );
}