import { z } from "zod";

const SUPPLIER_ID = "cj";
export const MIN_MARKUP = 2.5;

const money = z.number().finite().positive().max(100_000);
const cleanText = (max: number) => z.string().trim().min(1).max(max);

export const ingestItemSchema = z
  .object({
    sku: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9._-]+$/),
    name: cleanText(200),
    short_description: z.string().trim().max(400).default(""),
    full_description_html: z.string().max(20_000).default(""),
    category: cleanText(80).default("General"),
    cost_price: money,
    price: money.optional(),
    compare_at_price: money.optional(),
    image_url: z.url().max(2048),
    gallery_images: z.array(z.url().max(2048)).max(12).default([]),
    key_highlights: z.array(cleanText(160)).max(8).default([]),
    specifications: z.record(z.string(), z.string().max(300)).default({}),
    variants: z
      .array(
        z.object({
          sku: cleanText(64),
          label: cleanText(120),
          cost_price: money,
          stock: z.number().int().min(0).max(1_000_000).optional(),
        }),
      )
      .max(100)
      .default([]),
    tags: z.array(cleanText(40)).max(20).default([]),
    seo_title: z.string().trim().max(70).optional(),
    seo_description: z.string().trim().max(170).optional(),
    stock_quantity: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();

export const ingestBodySchema = z
  .object({
    run_id: z.string().trim().min(1).max(100),
    items: z.array(ingestItemSchema).min(1).max(25),
  })
  .strict();

export type IngestItem = z.infer<typeof ingestItemSchema>;

/** Smallest legal price in cents: ceil(cost * 2.5) — matches the DB check. */
export function minPriceCents(costDollars: number): number {
  return Math.ceil(Math.round(costDollars * 100) * MIN_MARKUP);
}

export function toRow(item: IngestItem, existingStatus?: string) {
  const floor = minPriceCents(item.cost_price);
  const requested = Math.round((item.price ?? 0) * 100);
  const priceCents = Math.max(floor, requested);
  // Only keep a compare-at price that is a genuine, higher, supplier-backed
  // reference; never invent one.
  const compareAt =
    item.compare_at_price && Math.round(item.compare_at_price * 100) > priceCents
      ? item.compare_at_price
      : null;
  return {
    supplier_id: SUPPLIER_ID,
    sku: item.sku,
    name: item.name,
    short_description: item.short_description,
    full_description_html: item.full_description_html,
    description: item.short_description,
    category: item.category,
    cost_price: item.cost_price,
    price: priceCents / 100,
    compare_at_price: compareAt,
    image_url: item.image_url,
    gallery_images: item.gallery_images,
    key_highlights: item.key_highlights,
    specifications: item.specifications,
    variants: item.variants,
    tags: item.tags,
    seo_title: item.seo_title ?? null,
    seo_description: item.seo_description ?? null,
    // New products always land as drafts for human review; an existing
    // product keeps whatever status an operator gave it.
    status: existingStatus ?? "draft",
    updated_at: new Date().toISOString(),
  };
}
