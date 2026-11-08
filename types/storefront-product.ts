export type ProductStatus = "draft" | "pending_review" | "active";

export interface ProductVariant {
  sku: string;
  options: Record<string, string>;
  costPrice: number;
  sellingPrice: number;
  compareAtPrice?: number;
  stockQuantity: number;
}

export interface StorefrontProduct {
  id: string;
  sku: string;
  supplierId: string;
  title: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  costPrice: number;
  sellingPrice: number;
  compareAtPrice?: number;
  stock: {
    quantity: number;
    available: boolean;
  };
  media: {
    primaryImage: string;
    galleryImages: string[];
  };
  shortDescription: string;
  fullDescriptionHtml: string;
  keyHighlights: string[];
  specifications: Record<string, string>;
  variants: ProductVariant[];
  status: ProductStatus;
}
