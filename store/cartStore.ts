import { create } from "zustand";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartStore {
  items: Product[];
  addItem: (item: Product) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
}));
