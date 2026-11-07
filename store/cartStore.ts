import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, Product } from "../types/product";

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  updateQuantity: (productId: Product["id"], quantity: number) => void;
  removeItem: (productId: Product["id"]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => String(item.product.id) === String(product.id),
          );

          if (existingItem) {
            if (
              existingItem.quantity >=
              Math.min(product.stock_quantity, 99)
            ) {
              return state;
            }
            return {
              items: state.items.map((item) =>
                String(item.product.id) === String(product.id)
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }

          if (product.stock_quantity < 1) return state;
          return {
            items: [...state.items, { product, quantity: 1 }],
          };
        }),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          const currentItem = state.items.find(
            (item) => String(item.product.id) === String(productId),
          );
          const maximum = Math.min(currentItem?.product.stock_quantity ?? 99, 99);
          const nextQuantity = Number.isFinite(quantity)
            ? Math.min(Math.floor(quantity), maximum)
            : 0;

          return {
            items:
              nextQuantity <= 0
                ? state.items.filter(
                    (item) => String(item.product.id) !== String(productId),
                  )
                : state.items.map((item) =>
                    String(item.product.id) === String(productId)
                      ? { ...item, quantity: nextQuantity }
                      : item,
                  ),
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter(
            (item) => String(item.product.id) !== String(productId),
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "pawnest-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
