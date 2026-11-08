import { ProductPipelineValidationError } from "./errors";
import type { ProductVariant } from "../../types/storefront-product";

export const MINIMUM_MARKUP_MULTIPLIER = 2.5;

export interface NormalizedSupplierProduct {
  supplierId: string;
  sku: string;
  title: string;
  category: string;
  costPrice: number;
  compareAtPrice?: number;
  stockQuantity: number;
  primaryImage: string;
  galleryImages: string[];
  specifications: Record<string, string>;
  variants: ProductVariant[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstValue(
  record: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function requiredText(
  value: unknown,
  label: string,
  maxLength = 500,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ProductPipelineValidationError(`${label} is required.`);
  }
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length > maxLength) {
    throw new ProductPipelineValidationError(
      `${label} must be ${maxLength} characters or fewer.`,
    );
  }
  return text;
}

function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ProductPipelineValidationError(`${label} must be text.`);
  }
  const result = String(value).trim().replace(/\s+/g, " ");
  if (result.length > 1000) {
    throw new ProductPipelineValidationError(
      `${label} must be 1000 characters or fewer.`,
    );
  }
  return result.length > 0 ? result : undefined;
}

function parseMoney(value: unknown, label: string): number {
  const normalized =
    typeof value === "string" ? value.trim().replace(/[$,\s]/g, "") : value;
  const amount =
    typeof normalized === "number"
      ? normalized
      : typeof normalized === "string" && normalized.length > 0
        ? Number(normalized)
        : Number.NaN;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ProductPipelineValidationError(
      `${label} must be a positive number.`,
    );
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function parseQuantity(value: unknown, label: string): number {
  const quantity =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new ProductPipelineValidationError(
      `${label} must be a whole number greater than or equal to zero.`,
    );
  }
  return quantity;
}

function parseImage(value: unknown, label: string): string {
  const image = requiredText(value, label, 2048);
  let url: URL;
  try {
    url = new URL(image);
  } catch {
    throw new ProductPipelineValidationError(`${label} must be a valid URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProductPipelineValidationError(
      `${label} must use HTTP or HTTPS.`,
    );
  }
  return url.toString();
}

function parseOptions(value: unknown, label: string): Record<string, string> {
  const record = asRecord(value);
  if (!record) {
    throw new ProductPipelineValidationError(
      `${label} must contain at least one named option.`,
    );
  }

  const options: Record<string, string> = {};
  for (const [key, optionValue] of Object.entries(record)) {
    if (
      key.trim().length === 0 ||
      key.trim().length > 60 ||
      typeof optionValue !== "string" ||
      !optionValue.trim() ||
      optionValue.trim().length > 100
    ) {
      throw new ProductPipelineValidationError(
        `${label} option "${key}" must have a value.`,
      );
    }
    options[key.trim()] = optionValue.trim();
  }
  if (Object.keys(options).length === 0) {
    throw new ProductPipelineValidationError(
      `${label} must contain at least one named option.`,
    );
  }
  return options;
}

export function calculateSellingPrice(costPrice: number): number {
  const costInCents = Math.round(costPrice * 100);
  return Math.ceil(costInCents * MINIMUM_MARKUP_MULTIPLIER) / 100;
}

function parseVariants(
  raw: Record<string, unknown>,
  sku: string,
  costPrice: number,
  stockQuantity: number,
): ProductVariant[] {
  const rawVariants = firstValue(raw, ["variants"]);
  if (rawVariants === undefined || rawVariants === null) {
    return [
      {
        sku,
        options: { Style: "Standard" },
        costPrice,
        sellingPrice: calculateSellingPrice(costPrice),
        stockQuantity,
      },
    ];
  }
  if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
    throw new ProductPipelineValidationError(
      "variants must be a non-empty array when provided.",
    );
  }
  if (rawVariants.length > 100) {
    throw new ProductPipelineValidationError(
      "A product cannot contain more than 100 variants.",
    );
  }

  const variants = rawVariants.map((value, index): ProductVariant => {
    const variant = asRecord(value);
    if (!variant) {
      throw new ProductPipelineValidationError(
        `Variant ${index + 1} must be an object.`,
      );
    }
    const variantSku = requiredText(
      firstValue(variant, ["sku", "variant_sku"]),
      `Variant ${index + 1} SKU`,
      100,
    );
    const variantCost = parseMoney(
      firstValue(variant, ["costPrice", "cost_price", "wholesale_price"]) ??
        costPrice,
      `Variant ${index + 1} cost price`,
    );
    const variantStock = parseQuantity(
      firstValue(variant, ["stockQuantity", "stock_quantity", "quantity"]),
      `Variant ${index + 1} stock quantity`,
    );

    return {
      sku: variantSku,
      options: parseOptions(
        firstValue(variant, ["options", "option_values"]),
        `Variant ${index + 1}`,
      ),
      costPrice: variantCost,
      sellingPrice: calculateSellingPrice(variantCost),
      stockQuantity: variantStock,
    };
  });

  const seenSkus = new Set<string>();
  for (const variant of variants) {
    if (seenSkus.has(variant.sku)) {
      throw new ProductPipelineValidationError(
        `Variant SKU "${variant.sku}" is duplicated.`,
      );
    }
    seenSkus.add(variant.sku);
  }
  return variants;
}

export function normalizeSupplierProduct(
  value: unknown,
): NormalizedSupplierProduct {
  const raw = asRecord(value);
  if (!raw) {
    throw new ProductPipelineValidationError(
      "Supplier product must be a JSON object.",
    );
  }

  const supplierId = requiredText(
    firstValue(raw, ["supplierId", "supplier_id", "supplier"]),
    "supplierId",
    100,
  );
  const sku = requiredText(
    firstValue(raw, ["sku", "supplier_sku"]),
    "SKU",
    100,
  );
  const title = requiredText(
    firstValue(raw, ["title", "name", "product_title"]),
    "title",
    200,
  );
  const category = requiredText(
    firstValue(raw, ["category", "product_type"]),
    "category",
    120,
  );
  const costPrice = parseMoney(
    firstValue(raw, ["costPrice", "cost_price", "wholesale_price", "cost"]),
    "costPrice",
  );
  const rawVariants = firstValue(raw, ["variants"]);
  const rawStock = firstValue(raw, [
    "stockQuantity",
    "stock_quantity",
    "quantity",
  ]);
  const parentStock =
    rawStock === undefined && Array.isArray(rawVariants)
      ? 0
      : parseQuantity(rawStock, "stock quantity");

  const rawGallery = firstValue(raw, [
    "galleryImages",
    "gallery_images",
    "images",
  ]);
  if (rawGallery !== undefined && !Array.isArray(rawGallery)) {
    throw new ProductPipelineValidationError(
      "galleryImages must be an array of image URLs.",
    );
  }
  if (Array.isArray(rawGallery) && rawGallery.length > 30) {
    throw new ProductPipelineValidationError(
      "A product cannot contain more than 30 gallery images.",
    );
  }
  const gallery = (rawGallery as unknown[] | undefined)?.map((image, index) =>
    parseImage(image, `Gallery image ${index + 1}`),
  );
  const rawPrimary = firstValue(raw, [
    "primaryImage",
    "primary_image",
    "image_url",
    "image",
  ]);
  const primaryImage = parseImage(
    rawPrimary ?? gallery?.[0],
    "primary image",
  );
  const galleryImages = [...new Set([primaryImage, ...(gallery ?? [])])];

  const rawSpecifications = asRecord(
    firstValue(raw, ["specifications", "physicalSpecifications"]) ?? {},
  );
  if (!rawSpecifications) {
    throw new ProductPipelineValidationError(
      "specifications must be a dictionary of names and values.",
    );
  }
  if (Object.keys(rawSpecifications).length > 50) {
    throw new ProductPipelineValidationError(
      "A product cannot contain more than 50 specifications.",
    );
  }
  const specifications: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawSpecifications)) {
    const text = optionalText(value, `Specification "${key}"`);
    if (text) specifications[key.trim().toLowerCase()] = text;
  }
  for (const key of ["material", "dimensions", "weight"]) {
    const directValue = optionalText(raw[key], `Specification "${key}"`);
    if (!specifications[key] && directValue) specifications[key] = directValue;
    if (!specifications[key]) {
      throw new ProductPipelineValidationError(
        `Required specification "${key}" is missing.`,
      );
    }
  }

  const variants = parseVariants(raw, sku, costPrice, parentStock);
  const variantStock = variants.reduce(
    (total, variant) => total + variant.stockQuantity,
    0,
  );
  if (!Number.isSafeInteger(variantStock)) {
    throw new ProductPipelineValidationError(
      "Combined variant stock exceeds the supported quantity.",
    );
  }
  const compareAtValue = firstValue(raw, ["compareAtPrice", "compare_at_price"]);
  const compareAtPrice =
    compareAtValue === undefined || compareAtValue === null
      ? undefined
      : parseMoney(compareAtValue, "compareAtPrice");
  const sellingPrice = calculateSellingPrice(costPrice);
  if (compareAtPrice !== undefined && compareAtPrice < sellingPrice) {
    throw new ProductPipelineValidationError(
      "compareAtPrice must be greater than or equal to the minimum selling price.",
    );
  }

  return {
    supplierId,
    sku,
    title,
    category,
    costPrice,
    compareAtPrice,
    stockQuantity: variantStock,
    primaryImage,
    galleryImages,
    specifications,
    variants,
  };
}
