import { calculateSellingPrice } from "./normalize";
import { ProductPipelineValidationError } from "./errors";
import type {
  ProductVariant,
  StorefrontProduct,
} from "../../types/storefront-product";
import type { NormalizedSupplierProduct } from "./normalize";
import type { EnrichedProductCopy } from "./enrich";

export type ProductCandidate = Omit<StorefrontProduct, "id">;

function validateVariant(variant: ProductVariant, index: number): void {
  if (!variant.sku.trim()) {
    throw new ProductPipelineValidationError(
      `Variant ${index + 1} must have a SKU.`,
    );
  }
  if (Object.keys(variant.options).length === 0) {
    throw new ProductPipelineValidationError(
      `Variant ${index + 1} must have at least one option.`,
    );
  }
  for (const [name, value] of Object.entries(variant.options)) {
    if (!name.trim() || !value.trim()) {
      throw new ProductPipelineValidationError(
        `Variant ${index + 1} options must have both names and values.`,
      );
    }
  }
  if (
    !Number.isFinite(variant.costPrice) ||
    variant.costPrice <= 0 ||
    variant.sellingPrice < calculateSellingPrice(variant.costPrice)
  ) {
    throw new ProductPipelineValidationError(
      `Variant ${index + 1} does not meet the minimum 2.5x cost markup.`,
    );
  }
  if (!Number.isSafeInteger(variant.stockQuantity) || variant.stockQuantity < 0) {
    throw new ProductPipelineValidationError(
      `Variant ${index + 1} has invalid stock quantity.`,
    );
  }
}

export function createAndValidateCandidate(
  supplier: NormalizedSupplierProduct,
  copy: EnrichedProductCopy,
): ProductCandidate {
  if (
    !supplier.supplierId ||
    !supplier.sku ||
    !supplier.title ||
    !supplier.category
  ) {
    throw new ProductPipelineValidationError(
      "Supplier ID, SKU, title, and category are required.",
    );
  }
  if (
    !supplier.primaryImage ||
    supplier.galleryImages.length === 0 ||
    supplier.galleryImages.some((image) => !image)
  ) {
    throw new ProductPipelineValidationError(
      "A primary image and at least one gallery image are required.",
    );
  }
  for (const key of ["material", "dimensions", "weight"]) {
    if (!supplier.specifications[key]?.trim()) {
      throw new ProductPipelineValidationError(
        `Required specification "${key}" is missing.`,
      );
    }
  }
  if (supplier.variants.length === 0) {
    throw new ProductPipelineValidationError(
      "At least one complete product variant is required.",
    );
  }
  supplier.variants.forEach(validateVariant);
  if (!copy.shortDescription.trim() || !copy.fullDescriptionHtml.trim()) {
    throw new ProductPipelineValidationError(
      "Short and full product descriptions are required.",
    );
  }
  if (!copy.seoTitle.trim() || copy.seoTitle.length >= 60) {
    throw new ProductPipelineValidationError(
      "SEO title must be populated and shorter than 60 characters.",
    );
  }
  if (!copy.seoDescription.trim() || copy.seoDescription.length >= 155) {
    throw new ProductPipelineValidationError(
      "SEO description must be populated and shorter than 155 characters.",
    );
  }
  if (copy.keyHighlights.length < 3 || copy.tags.length === 0) {
    throw new ProductPipelineValidationError(
      "At least three product highlights and one SEO tag are required.",
    );
  }

  const sellingPrice = Math.max(
    calculateSellingPrice(supplier.costPrice),
    ...supplier.variants.map((variant) => variant.sellingPrice),
  );
  if (
    supplier.compareAtPrice !== undefined &&
    supplier.compareAtPrice < sellingPrice
  ) {
    throw new ProductPipelineValidationError(
      "compareAtPrice must be greater than or equal to sellingPrice.",
    );
  }

  return {
    sku: supplier.sku,
    supplierId: supplier.supplierId,
    title: supplier.title,
    category: supplier.category,
    tags: copy.tags,
    seoTitle: copy.seoTitle,
    seoDescription: copy.seoDescription,
    costPrice: supplier.costPrice,
    sellingPrice,
    compareAtPrice: supplier.compareAtPrice,
    stock: {
      quantity: supplier.stockQuantity,
      available: supplier.stockQuantity > 0,
    },
    media: {
      primaryImage: supplier.primaryImage,
      galleryImages: supplier.galleryImages,
    },
    shortDescription: copy.shortDescription,
    fullDescriptionHtml: copy.fullDescriptionHtml,
    keyHighlights: copy.keyHighlights,
    specifications: supplier.specifications,
    variants: supplier.variants,
    status: "draft",
  };
}
