import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AddToCartButton from "../../../components/AddToCartButton";
import ProductGallery from "../../../components/ProductGallery";
import ProductReviews from "../../../components/ProductReviews";
import SiteHeader from "../../../components/SiteHeader";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return { title: "Find not found | AuraFinds" };

    const description =
      data.seo_description ??
      data.description ??
      `Discover ${data.name}, curated by AuraFinds.`;
    const image = data.image_url ?? undefined;
    return {
      title: data.seo_title ?? `${data.name} | AuraFinds`,
      description,
      openGraph: {
        title: data.seo_title ?? data.name,
        description,
        type: "website",
        images: image ? [image] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: data.seo_title ?? data.name,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch (error) {
    console.error("Could not load product metadata:", error);
    return { title: "AuraFinds product" };
  }
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Could not load product details:", error);
    throw new Error("Could not load this product.");
  }
  if (!product) notFound();

  const gallery = [
    product.image_url,
    ...(Array.isArray(product.gallery_images) ? product.gallery_images : []),
  ].filter((image, index, images): image is string =>
    Boolean(image) && images.indexOf(image) === index,
  );
  const { data: reviews, error: reviewsError } = await supabase
    .from("product_reviews")
    .select("id, rating, title, body, created_at")
    .eq("product_id", String(product.id))
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (reviewsError) {
    console.error("Could not load product reviews:", reviewsError);
  }
  const approvedReviews = reviews ?? [];
  const rating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) /
        approvedReviews.length
      : 0;

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="product-detail">
        <Link className="back-link" href="/">
          &larr; Back to the collection
        </Link>
        <div className="product-detail-grid">
          <ProductGallery name={product.name} images={gallery} />
          <div className="product-detail-info">
            <p
              className={`product-detail-category category-${(product.category ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              {product.category ?? "AURAFINDS FAVORITE"}
            </p>
            <h1>{product.name}</h1>
            <p
              className="product-rating"
              aria-label={
                rating > 0
                  ? `${rating.toFixed(1)} out of 5 stars, ${approvedReviews.length} reviews`
                  : "New product"
              }
            >
              {rating > 0 ? (
                <>
                  <span aria-hidden="true">★</span> {rating.toFixed(1)}
                  <span className="rating-caption">
                    {" "}
                    ({approvedReviews.length}{" "}
                    {approvedReviews.length === 1 ? "review" : "reviews"})
                  </span>
                </>
              ) : (
                <span className="new-rating">★ New</span>
              )}
            </p>
            <p className="product-detail-price">
              {currency.format(Number(product.price))}
            </p>
            <p className="product-detail-description">{product.description}</p>
            <p className="stock-status">
              {product.stock_quantity > 0
                ? `${product.stock_quantity} in stock`
                : "Currently out of stock"}
            </p>
            <div className="product-trust-badges">
              <span>✓ Secure Checkout</span>
              <span>✓ 30-Day Money-Back Guarantee</span>
            </div>
            <AddToCartButton product={product} />
            <p className="product-care-note">
              Curated to make everyday life a little more delightful.
            </p>
          </div>
        </div>
        <ProductReviews
          productId={String(product.id)}
          reviews={approvedReviews}
          averageRating={rating}
        />
      </section>
    </main>
  );
}
