export interface Product {
  id: string | number;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
  image_url?: string | null;
  stock_quantity: number;
  rating: number;
  tags?: string[] | null;
  created_at?: string | null;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
