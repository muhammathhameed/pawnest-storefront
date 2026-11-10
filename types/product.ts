export interface Product {
  id: string | number;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
  image_url?: string | null;
  stock_quantity: number;
  rating: number;
  /** False once supplier stock falls below the safety threshold. */
  is_listed?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
