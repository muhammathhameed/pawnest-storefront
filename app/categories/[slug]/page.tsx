import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCatalog from "../../../components/ProductCatalog";
import SiteHeader from "../../../components/SiteHeader";
import { catalogCategories, getCatalogCategory, productMatchesCategory } from "../../../lib/catalog";
import { getProductReviewSummaries } from "../../../lib/reviews";
import { getSupabaseClient } from "../../../lib/supabase";
import type { Product } from "../../../types/product";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCatalogCategory(slug);
  if (!category) return { title: "Category not found | AuraFinds" };

  const title = `${category.name} | AuraFinds`;
  return {
    title,
    description: category.description,
    openGraph: { title, description: category.description, type: "website" },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCatalogCategory(slug);
  if (!category) notFound();

  let products: Product[] = [];
  let failed = false;
  try {
    const { data, error } = await getSupabaseClient()
      .from("products")
      .select("*")
      .eq("status", "active");
    if (error) throw error;
    products = ((data ?? []) as Product[]).filter((product) =>
      productMatchesCategory(product, slug),
    );
  } catch (error) {
    console.error(`Could not load ${category.name} catalog:`, error);
    failed = true;
  }
  const reviewSummaries = failed
    ? {}
    : await getProductReviewSummaries(products.map((product) => product.id));

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="category-hero">
        <div className="category-hero-copy">
          <p className="eyebrow">THE AURAFINDS EDIT</p>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
        <span className="category-hero-mark" aria-hidden="true">
          A
        </span>
      </section>
      <section className="shop-section category-shop">
        {failed ? (
          <div className="store-error" role="status">
            <h2>This collection is temporarily unavailable</h2>
            <p>Please check back in a moment.</p>
          </div>
        ) : (
          <ProductCatalog
            products={products}
            initialCategory={slug}
            reviewSummaries={reviewSummaries}
            showCollectionHeading={false}
          />
        )}
      </section>
    </main>
  );
}
