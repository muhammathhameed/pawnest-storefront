import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const category = resolvedParams?.category;
  const query = resolvedParams?.q;

  const config = getSupabasePublicConfig();
  let products: any[] = [];
  let isConfigured = !!config;

  if (isConfigured) {
    try {
      const supabase = createServerClient(config.url, config.anonKey, {
        cookies: {
          async getAll() {
            const cookieStore = await cookies();
            return cookieStore.getAll();
          },
          async setAll() {},
        },
      });

      let dbQuery = supabase.from("products").select("*").order("created_at", { ascending: false });

      if (category && category !== "All finds") {
        dbQuery = dbQuery.eq("category", category);
      }

      const { data, error } = await dbQuery;
      if (!error && data) {
        products = data;
      }
    } catch {
      isConfigured = false;
    }
  }

  // Fallback sample products if unconfigured or empty
  if (products.length === 0) {
    products = [
      {
        id: "sample-1",
        name: "PawNest CalmPad Dog Lick Mat",
        price: 19.99,
        category: "Pet Care",
        image_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80",
        description: "Interactive calming lick mat for dogs.",
        stock_count: 100,
      },
      {
        id: "sample-2",
        name: "Portable Paw Cleaner Cup",
        price: 24.99,
        category: "Pet Care",
        image_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80",
        description: "Portable cup for cleaning muddy paws.",
        stock_count: 100,
      },
      {
        id: "sample-3",
        name: "Smart LED Desk Lamp with Wireless Charger",
        price: 46.25,
        category: "Smart Tech & Gadgets",
        image_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        description: "Illuminate your workspace with wireless charging.",
        stock_count: 150,
      },
    ];
  }

  // Filter by query if present
  const filteredProducts = query
    ? products.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()) || p.description?.toLowerCase().includes(query.toLowerCase()))
    : products;

  const categories = ["All finds", "Pet Care", "Beauty & Skincare", "Smart Tech & Gadgets"];

  return (
    <main className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
            AuraFinds
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cart" className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors">
              🛒 View cart
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / Category Bar */}
      <div className="border-b bg-white px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Shop the collection</h1>
          <p className="text-sm text-neutral-500 mt-1">Curated viral finds across every category</p>
          
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
            {categories.map((cat) => {
              const active = (!category && cat === "All finds") || category === cat;
              return (
                <Link
                  key={cat}
                  href={cat === "All finds" ? "/" : `/?category=${encodeURIComponent(cat)}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => {
            const raw = product.raw_data || {};
            const img = product.image_url || raw.image_url || raw.image || raw.thumbnail || raw.img || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80";
            const stock = product.stock_count ?? raw.stock_count ?? 100;

            return (
              <div key={product.id} className="group flex flex-col bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                <Link href={`/products/${product.id}`} className="relative w-full aspect-[4/3] bg-white p-4 overflow-hidden block flex items-center justify-center">
                  <img
                    src={img}
                    alt={product.name}
                    className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.category && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-semibold text-neutral-800 shadow-xs">
                      {product.category}
                    </span>
                  )}
                </Link>

                <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-600">★ Curated Find</span>
                      <span className="text-xs text-neutral-400">{stock} available</span>
                    </div>
                    <Link href={`/products/${product.id}`}>
                      <h3 className="mt-1.5 font-semibold text-neutral-900 line-clamp-2 hover:text-emerald-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="mt-2 text-xl font-bold text-neutral-900">
                      ${Number(product.price || 0).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                      {product.description || "Curated to make everyday life a little more delightful."}
                    </p>
                  </div>

                  <Link
                    href={`/products/${product.id}`}
                    className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-neutral-800 transition-colors block"
                  >
                    View Product & AR
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
