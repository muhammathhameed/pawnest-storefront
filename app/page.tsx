import { supabase } from "../lib/supabase";
import AddToCartButton from "../components/AddToCartButton";
import CartButton from "../components/CartButton";
import type { Product } from "../types/product";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function Home() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*");

  if (error) {
    return (
      <main className="store-shell">
        <div className="store-error" role="alert">
          <h1>We couldn&apos;t load the shop</h1>
          <p>{error.message}</p>
        </div>
      </main>
    );
  }

  const availableProducts = (products ?? []) as Product[];

  return (
    <main className="store-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="PawNest Store home">
          <span className="brand-mark" aria-hidden="true">
            🐾
          </span>
          <span>
            <strong>PawNest</strong>
            <small>HAPPY PETS, HAPPY HOMES</small>
          </span>
        </a>
        <CartButton />
      </header>

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

        {availableProducts.length === 0 ? (
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
                  {product.image_url ? (
                    <img
                      className="product-image"
                      src={product.image_url}
                      alt={product.name}
                    />
                  ) : (
                    <div className="product-image product-image-placeholder">
                      <span aria-hidden="true">🐾</span>
                    </div>
                  )}
                  {product.category && (
                    <span className="product-category">{product.category}</span>
                  )}
                </div>
                <div className="product-info">
                  <div className="product-title-row">
                    <h3>{product.name}</h3>
                    <strong>{currency.format(Number(product.price))}</strong>
                  </div>
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
