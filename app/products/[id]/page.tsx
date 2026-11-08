import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "../../../components/AddToCartButton";
import SiteHeader from "../../../components/SiteHeader";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

interface ProductPageProps {
  params: Promise<{ id: string }>;
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

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="product-detail">
        <Link className="back-link" href="/">
          &larr; Back to the collection
        </Link>
        <div className="product-detail-grid">
          <div className="product-detail-image-wrap">
            <img
              className="product-detail-image"
              src={product.image_url ?? ""}
              alt={product.name}
            />
          </div>
          <div className="product-detail-info">
            <p className="eyebrow">{product.category ?? "PAWNEST FAVORITE"}</p>
            <h1>{product.name}</h1>
            <p className="product-rating" aria-label={`${product.rating} out of 5 stars`}>
              <span aria-hidden="true">★</span> {Number(product.rating).toFixed(1)}
              <span className="rating-caption"> customer rating</span>
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
            <AddToCartButton product={product} />
            <p className="product-care-note">
              Thoughtfully chosen for the pets who make life better.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
