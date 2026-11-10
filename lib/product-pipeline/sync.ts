import { createClient } from "../supabase/server";
import { normalizeSupplierProduct } from "./normalize";
import { enrichProductCopy } from "./enrich";
import { createAndValidateCandidate } from "./validate";
import {
  ProductPipelineConfigurationError,
  ProductPipelineSyncError,
} from "./errors";

export async function processSupplierProduct(rawProduct: unknown) {
  const supplierProduct = normalizeSupplierProduct(rawProduct);
  const supabase = await createClient();

  if (!supabase) {
    throw new ProductPipelineConfigurationError(
      "Supabase server client could not be initialized."
    );
  }
  const copy = await enrichProductCopy(supplierProduct);
  const product = createAndValidateCandidate(supplierProduct, copy);

  const supplierId = (supplierProduct as any).supplierId || (supplierProduct as any).supplier_id || "default-supplier";
  const sku = (supplierProduct as any).sku || (product.variants?.[0]?.sku) || product.external_id;
  const price = (supplierProduct as any).price ?? (product.variants?.[0]?.price) ?? 0.00;

  const { data, error } = await supabase
    .from("products")
    .upsert(
      {
        supplier_id: supplierId,
        sku: sku,
        name: product.title,
        price: price,
        description: product.description,
        features: product.features,
        tags: product.tags,
        raw_data: product.raw_data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sku" }
    )
    .select()
    .single();

  if (error) {
    throw new ProductPipelineSyncError(
      `Failed to sync product to database: ${error.message}`
    );
  }

  return data;
}
