import ProductCatalog from "../components/ProductCatalog";
import SiteHeader from "../components/SiteHeader";
import { getProductReviewSummaries } from "../lib/reviews";
import { getSupabaseClient } from "../lib/supabase";
import type { Product } from "../types/product";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let error: Error | { message: string } | null = null;
  try {
    const result = await getSupabaseClient()
      .from("products")
      .select("*")
      .eq("status", "active");
    products = (result.data ?? []) as Product[];
    error = result.error;
    if (result.error) {
      console.error("Could not load storefront products from Supabase:", result.error);
    }
  } catch (caughtError) {
    console.error("Supabase is not configured for the storefront:", caughtError);
    error = caughtError instanceof Error ? caughtError : new Error("Store unavailable");
  }
  const availableProducts = products;
  const reviewSummaries = await getProductReviewSummaries(
    availableProducts.map((product) => product.id),
  );

  return (
    <main className="store-shell">
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">THE INTERNET’S BEST-KEPT FINDS</p>
          <h1>Little discoveries. Big main-character energy.</h1>
          <p>
            Curated Viral Finds Across Every Category. Meet your next “how did I
            live without this?”
          </p>
          <a className="hero-link" href="#shop">
            Explore the edit <span aria-hidden="true">&darr;</span>
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-sun" />
          <span className="hero-paw">✦</span>
          <span className="hero-caption">curated for your everyday</span>
        </div>
      </section>

      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED VIRAL FINDS ACROSS EVERY CATEGORY</p>
            <h2>Find your next favorite</h2>
          </div>
        </div>

        {error ? (
          <div className="store-error" role="status">
            <h3>The collection is taking a break</h3>
            <p>Products are temporarily unavailable. Please try again soon.</p>
          </div>
        ) : availableProducts.length === 0 ? (
          <div className="empty-products">
            <span aria-hidden="true">✦</span>
            <h3>Fresh finds are on the way</h3>
            <p>Check back soon for your next everyday favorite.</p>
          </div>
        ) : (
          <ProductCatalog
            products={availableProducts}
            reviewSummaries={reviewSummaries}
          />
        )}
      </section>

      <footer className="site-footer">
        <span className="footer-paw" aria-hidden="true">
          ✦
        </span>
        <p>AuraFinds — Curated Viral Finds Across Every Category.</p>
      </footer>
    </main>
  );
}
