import { getSupabaseClient } from "./supabase";

export interface ProductReviewSummary {
  count: number;
  rating: number;
}

function isReviewsTableMissing(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "42P01" ||
    (error.code === "PGRST205" &&
      error.message?.includes("product_reviews") === true)
  );
}

export async function getProductReviewSummaries(
  productIds: Array<string | number>,
): Promise<Record<string, ProductReviewSummary>> {
  const ids = [...new Set(productIds.map(String))];
  if (ids.length === 0) return {};

  try {
    const { data, error } = await getSupabaseClient()
      .from("product_reviews")
      .select("product_id, rating")
      .eq("status", "approved")
      .in("product_id", ids);
    if (error) {
      if (isReviewsTableMissing(error)) {
        console.warn(
          "Product reviews are not enabled in Supabase; apply migration 20261107000500_product_reviews.sql.",
        );
        return {};
      }

      console.error("Could not load product review summaries:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {};
    }

    return (data ?? []).reduce<Record<string, ProductReviewSummary>>(
      (summaries, review) => {
        const current = summaries[review.product_id] ?? {
          count: 0,
          rating: 0,
        };
        current.rating += review.rating;
        current.count += 1;
        summaries[review.product_id] = current;
        return summaries;
      },
      {},
    );
  } catch (error) {
    console.error("Could not initialize product review lookup:", error);
    return {};
  }
}
