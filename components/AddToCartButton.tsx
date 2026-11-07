"use client";

import { useCartStore } from "../store/cartStore";
import type { Product } from "../types/product";
import { toast } from "sonner";

export default function AddToCartButton({
  product,
}: {
  product: Product;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const currentQuantity =
    items.find((item) => String(item.product.id) === String(product.id))
      ?.quantity ?? 0;
  const isOutOfStock = product.stock_quantity <= currentQuantity;

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => {
        addItem(product);
        toast.success(`${product.name} added to your cart.`);
      }}
      className="add-to-cart-button"
      aria-label={
        isOutOfStock
          ? `${product.name} is out of stock`
          : `Add ${product.name} to cart`
      }
    >
      {isOutOfStock ? "Out of stock" : "Add to cart"}
    </button>
  );
}