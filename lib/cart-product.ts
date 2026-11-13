import type { Product } from "../types/product";

/**
 * Homepage/concierge items use { image, available, price } while the cart store
 * expects Product { image_url, stock_quantity, price: number }. Returns null when
 * the item has no usable id/name/price so a bad item never reaches the cart.
 */
export function toCartProduct(raw: any): Product | null {
  if (!raw || raw.id === undefined || raw.id === null || raw.id === "") return null;
  const name = String(raw.name ?? raw.title ?? "").trim();
  const price =
    typeof raw.price === "number" ? raw.price : parseFloat(String(raw.price ?? "").replace(/[^0-9.]/g, ""));
  if (!name || !Number.isFinite(price) || price < 0) return null;
  const stock = Number(raw.stock_quantity ?? raw.available ?? 0);
  return {
    id: String(raw.id),
    name,
    price,
    description: raw.description ?? null,
    category: raw.category ?? null,
    image_url: raw.image_url ?? raw.image ?? null,
    stock_quantity: Number.isFinite(stock) ? stock : 0,
    rating: Number(raw.rating ?? 5),
  };
}
