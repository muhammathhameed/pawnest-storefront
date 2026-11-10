import Link from "next/link";
import AddToCartButton from "../components/AddToCartButton";
import SiteHeader from "../components/SiteHeader";
import { getSupabaseClient } from "../lib/supabase";
import type { Product } from "../types/product";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function Home() {
  let products: Product[] = [];
  let error: Error | { message: string } | null = null;
  try {
    const result = await getSupabaseClient().from("products")
      .select("*")
      .eq("is_listed", true);
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

  return (
    <main className="store-shell">
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A LITTLE JOY FOR EVERY PAW</p>
          <h1>Good things for your best friend.</h1>
          <p>
            Thoughtful finds, everyday favorites, and tail-wagging essentials
            for the pets who make life better.
          </p>
          <a className="hero-link" href="#shop">
            Shop the collection <span aria-hidden="true">&darr;</span>
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-sun" />
          <span className="hero-paw">🐾</span>
          <span className="hero-caption">made for your sidekick</span>
        </div>
      </section>

      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE PAWNEST EDIT</p>
            <h2>Shop the collection</h2>
          </div>
          <p className="product-count">
            {availableProducts.length}{" "}
            {availableProducts.length === 1 ? "goodie" : "goodies"} for your
            sidekick
          </p>
        </div>

        {error ? (
          <div className="store-error" role="status">
            <h3>The collection is taking a break</h3>
            <p>Products are temporarily unavailable. Please try again soon.</p>
          </div>
        ) : availableProducts.length === 0 ? (
          <div className="empty-products">
            <span aria-hidden="true">🌱</span>
            <h3>New favorites are on the way</h3>
            <p>Check back soon for lovely things for your pet.</p>
          </div>
        ) : (
          <div className="product-grid">
            {availableProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <Link href={`/products/${product.id}`}>
                    {product.image_url && (
                      <img
                        className="product-image"
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                      />
                    )}
                  </Link>
                  {product.category && (
                    <span className="product-category">{product.category}</span>
                  )}
                </div>
                <div className="product-info">
                  <div className="product-title-row">
                    <h3>{product.name}</h3>
                    <strong>{currency.format(Number(product.price))}</strong>
                  </div>
                  <p className="product-rating">
                    <span aria-hidden="true">★</span>{" "}
                    {Number(product.rating).toFixed(1)}
                  </p>
                  {product.description && (
                    <p className="product-description">
                      {product.description}
                    </p>
                  )}
                  <AddToCartButton product={product} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span className="footer-paw" aria-hidden="true">
          🐾
        </span>
        <p>Made with love for the ones who make a house feel like home.</p>
      </footer>
    </main>
  );
}
