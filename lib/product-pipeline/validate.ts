import { ProductPipelineValidationError } from "./errors";
import type { EnrichedProductCopy } from "./enrich";

export interface SupplierProduct {
  id: string;
  title?: string;
  description?: string;
  variants?: Array<{
    id: string;
    price: number;
    sku?: string;
  }>;
  [key: string]: any;
}

export function validateSupplierProduct(supplier: SupplierProduct, copy: EnrichedProductCopy) {
  if (!supplier || !supplier.id) {
    throw new ProductPipelineValidationError("Invalid supplier product: missing ID.");
  }

  const titleToCheck = copy.title || supplier.title;
  if (!titleToCheck || !titleToCheck.trim()) {
    throw new ProductPipelineValidationError("Product title is required.");
  }

  const descToCheck = copy.description || supplier.description || "";
  if (!descToCheck.trim()) {
    throw new ProductPipelineValidationError("Product description is required.");
  }

  if (supplier.variants) {
    supplier.variants.forEach((variant) => {
      if (!variant.id || typeof variant.price !== "number" || variant.price < 0) {
        throw new ProductPipelineValidationError(`Invalid variant found for product ${supplier.id}`);
      }
    });
  }

  return true;
}
