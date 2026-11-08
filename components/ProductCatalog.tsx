"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { catalogCategories, productMatchesCategory } from "../lib/catalog";
import type { ProductReviewSummary } from "../lib/reviews";
import type { Product } from "../types/product";
import AddToCartButton from "./AddToCartButton";
import StoreImage from "./StoreImage";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

interface ProductCatalogProps {
  products: Product[];
  initialCategory?: string;
  reviewSummaries?: Record<string, ProductReviewSummary>;
  showCollectionHeading?: boolean;
}

export default function ProductCatalog({
  products,
  initialCategory = "all",
  reviewSummaries = {},
  showCollectionHeading = true,
}: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("relevance");
  const activeCategorySlug = initialCategory;

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matching = products.filter((product) => {
      const matchesCategory =
        activeCategorySlug === "all" ||
        productMatchesCategory(product, activeCategorySlug);
      const searchable = [
        product.name,
        product.category ?? "",
        product.description ?? "",
        ...(product.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });

    return matching.sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      if (sort === "newest") {
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
      }
      if (normalizedQuery) {
        const score = (product: Product) => {
          const name = product.name.toLowerCase();
          return name === normalizedQuery
            ? 0
            : name.startsWith(normalizedQuery)
              ? 1
              : name.includes(normalizedQuery)
                ? 2
                : 3;
        };
        return score(a) - score(b);
      }
      return 0;
    });
  }, [activeCategorySlug, products, query, sort]);

  const suggestions = query.trim()
    ? visibleProducts.slice(0, 5)
    : [];
  const activeCategory = catalogCategories.find(
    (item) => item.slug === activeCategorySlug,
  );

  return (
    <>
      <div className="catalog-controls">
        <div className="catalog-tools">
          <div className="catalog-search">
            <label className="sr-only" htmlFor="catalog-search">
              Search products
            </label>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search curated finds"
              autoComplete="off"
              aria-expanded={suggestions.length > 0}
              aria-controls="catalog-suggestions"
            />
            {suggestions.length > 0 && (
              <ul className="catalog-suggestions" id="catalog-suggestions">
                {suggestions.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.id}`}
                      onClick={() => setQuery("")}
                    >
                      {product.name}
                      <span>{currency.format(Number(product.price))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="catalog-sort-label">
            <span className="sr-only">Sort products</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      {!showCollectionHeading && (
        <p className="catalog-results-meta">
          Showing <strong>{visibleProducts.length}</strong>{" "}
          {visibleProducts.length === 1 ? "curated find" : "curated finds"}
        </p>
      )}

      {showCollectionHeading && (
        <div className="section-heading catalog-heading">
          <div>
            <p className="eyebrow">
              {activeCategory?.name ?? "THE AURAFINDS EDIT"}
            </p>
            <h2>
              {activeCategory
                ? `Shop ${activeCategory.name}`
                : "Shop the collection"}
            </h2>
          </div>
          <p className="product-count">
            {visibleProducts.length}{" "}
            {visibleProducts.length === 1 ? "find" : "finds"}
          </p>
        </div>
      )}

      {visibleProducts.length === 0 ? (
        <div className="empty-products">
          <span aria-hidden="true">✦</span>
          <h3>No matching finds just yet</h3>
          <p>Try another search or explore a different category.</p>
        </div>
      ) : (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image-wrap">
                <Link
                  href={`/products/${product.id}`}
                  aria-label={`View ${product.name}`}
                >
                  {product.image_url ? (
                    <StoreImage
                      className="product-image"
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="product-image product-image-placeholder" aria-hidden="true">
                      ✦
                    </div>
                  )}
                </Link>
                {product.category && (
                  <span
                    className={`product-category category-${(product.category ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    {product.category}
                  </span>
                )}
              </div>
              <div className="product-info">
                <div className="product-title-row">
                  <h3>
                    <Link href={`/products/${product.id}`}>{product.name}</Link>
                  </h3>
                  <strong>{currency.format(Number(product.price))}</strong>
                </div>
                <p className="product-rating">
                  {(reviewSummaries[String(product.id)]?.count ?? 0) > 0 ? (
                    <>
                      <span aria-hidden="true">★</span>{" "}
                      {(
                        (reviewSummaries[String(product.id)]?.rating ?? 0) /
                        (reviewSummaries[String(product.id)]?.count ?? 1)
                      ).toFixed(1)}
                      <span className="rating-caption">
                        {" "}
                        ({reviewSummaries[String(product.id)]?.count})
                      </span>
                    </>
                  ) : (
                    <span className="new-rating">★ New</span>
                  )}
                </p>
                <p
                  className={`stock-status${product.stock_quantity > 0 ? "" : " out-of-stock"}`}
                >
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} available`
                    : "Sold out"}
                </p>
                {product.description && (
                  <p className="product-description">{product.description}</p>
                )}
                <AddToCartButton product={product} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
