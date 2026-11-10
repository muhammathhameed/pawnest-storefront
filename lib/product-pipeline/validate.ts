import { ProductPipelineValidationError } from "./errors";
import type { EnrichedProductCopy } from "./enrich";

export interface SupplierProduct {
  id?: string;
  external_id?: string;
  title?: string;
  description?: string;
  variants?: Array<any>;
  [key: string]: any;
}

export function validateSupplierProduct(supplier: SupplierProduct, copy: EnrichedProductCopy) {
  if (!supplier || (!supplier.id && !supplier.external_id)) {
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

  if (supplier.variants && Array.isArray(supplier.variants)) {
    supplier.variants.forEach((variant) => {
      if (variant && typeof variant === "object") {
        const hasId = variant.id !== undefined && variant.id !== null;
        const price = Number(variant.price);
        if (!hasId || isNaN(price) || price < 0) {
          throw new ProductPipelineValidationError(`Invalid variant found for product ${supplier.id || supplier.external_id}`);
        }
      }
    });
  }

  return true;
}

// Helper function expected by sync pipeline to create and validate product candidate
export function createAndValidateCandidate(supplierProduct: SupplierProduct, copy: EnrichedProductCopy) {
  validateSupplierProduct(supplierProduct, copy);

  const productId = supplierProduct.id || supplierProduct.external_id || "unknown-id";

  return {
    external_id: productId,
    title: copy.title || supplierProduct.title || "Untitled Product",
    description: copy.description || supplierProduct.description || "",
    features: copy.features || [],
    tags: copy.tags || [],
    variants: supplierProduct.variants || [],
    raw_data: supplierProduct,
    created_at: new Date().toISOString(),
  };
}
