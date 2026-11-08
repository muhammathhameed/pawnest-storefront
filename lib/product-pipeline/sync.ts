import { getSupabaseAdmin } from "../supabaseAdmin";
import { google } from "@ai-sdk/google";
import type { Json } from "../../types/database";
import type { StorefrontProduct } from "../../types/storefront-product";
import { enrichProductCopy } from "./enrich";
import {
  ProductPipelineConfigurationError,
  ProductPipelineSyncError,
} from "./errors";
import { normalizeSupplierProduct } from "./normalize";
import { createAndValidateCandidate } from "./validate";

export async function processSupplierProduct(rawProduct: unknown) {
  const supplierProduct = normalizeSupplierProduct(rawProduct);
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    throw new ProductPipelineConfigurationError(
      "Supabase server credentials are missing or invalid.",
    );
  }
  const copy = await enrichProductCopy(supplierProduct);
  const product = createAndValidateCandidate(supplierProduct, copy);

  const { data, error } = await supabase
    .from("products")
    .upsert(
      {
        supplier_id: product.supplierId,
        sku: product.sku,
        name: product.title,
        price: product.sellingPrice,
        cost_price: product.costPrice,
        compare_at_price: product.compareAtPrice ?? null,
        description: product.shortDescription,
        short_description: product.shortDescription,
        full_description_html: product.fullDescriptionHtml,
        category: product.category,
        tags: product.tags,
        seo_title: product.seoTitle,
        seo_description: product.seoDescription,
        image_url: product.media.primaryImage,
        gallery_images: product.media.galleryImages,
        key_highlights: product.keyHighlights,
        specifications: JSON.parse(
          JSON.stringify(product.specifications),
        ) as Json,
        variants: JSON.parse(JSON.stringify(product.variants)) as Json,
        stock_quantity: product.stock.quantity,
        status: product.status,
      },
      { onConflict: "supplier_id,sku" },
    )
    .select("id")
    .single();

  if (error) {
    throw new ProductPipelineSyncError(
      `Could not sync supplier product: ${error.message}`,
    );
  }
  if (!data?.id) {
    throw new ProductPipelineSyncError(
      "Supabase did not return an ID for the synced product.",
    );
  }

  return { ...product, id: String(data.id) } satisfies StorefrontProduct;
}
