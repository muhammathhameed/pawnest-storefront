import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import SiteHeader from "../../../components/SiteHeader";
import Link from "next/link";
import WebARViewer from "@/components/WebARViewer";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  const rawData = product.raw_data || {};
  const primaryImage = product.image_url || rawData.image_url || rawData.image || rawData.thumbnail || rawData.img || "/placeholder.jpg";
  const modelUrl = product.model_url || rawData.model_url || "";
  const iosModelUrl = product.ios_model_url || rawData.ios_model_url || "";

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Back to the collection
        </Link>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          {/* Product Image & WebAR Viewer Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative w-full aspect-square max-h-[550px] overflow-hidden glass rounded-[var(--r-xl)] flex items-center justify-center">
              {primaryImage && primaryImage !== "/placeholder.jpg" ? (
                <img
                  src={primaryImage}
                  alt={product.name || "Product image"}
                  className="w-full h-full object-contain object-center p-4 bg-card"
                />
              ) : (
                <div className="text-muted text-sm">No image available</div>
              )}
            </div>

            {/* Integrated WebAR / 3D Viewer Component */}
            <div className="glass-card">
              <WebARViewer
                modelSrc={modelUrl}
                iosModelSrc={iosModelUrl}
                altText={product.name}
                productName={product.name}
                category={product.category}
              />
            </div>
          </div>

          {/* Product Details Column */}
          <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
            <div>
              <span className="badge badge-success">
                ★ Curated Find
              </span>
              <h1 className="mt-3 t-page">
                {product.name}
              </h1>
              <p className="mt-3 t-page">
                ${Number(product.price || 0).toFixed(2)}
              </p>
            </div>

            <div className="border-y border-line py-6 text-ink space-y-4">
              <p className="leading-relaxed text-sm sm:text-base">{product.description}</p>
            </div>

            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-3">KeyFeatures</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4">
              <button className="btn btn-primary w-full !min-h-12">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
