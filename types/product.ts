export interface Product {
  id: string | number;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
  image_url?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
