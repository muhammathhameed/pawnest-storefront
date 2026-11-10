import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
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
  const primaryImage = product.image_url || rawData.image_url || rawData.image || "/placeholder.jpg";
  const modelUrl = product.model_url || rawData.model_url || "";
  const iosModelUrl = product.ios_model_url || rawData.ios_model_url || "";

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
            AuraFinds
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cart" className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200">
              View cart
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Link href="/" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          ← Back to the collection
        </Link>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Product Image & WebAR Viewer */}
          <div className="space-y-6">
            <div className="relative aspect-square overflow-hidden rounded-2xl border bg-white shadow-sm">
              <Image
                src={primaryImage}
                alt={product.name || "Product image"}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Integrated WebAR / 3D Viewer Component */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Interactive 3D & Augmented Reality</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Inspect this product in 3D or place it directly in your space using your mobile device camera.
              </p>
              <WebARViewer
                modelSrc={modelUrl}
                iosModelSrc={iosModelUrl}
                altText={product.name}
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-start space-y-6">
            <div>
              <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                ★ Curated Find
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
                {product.name}
              </h1>
              <p className="mt-2 text-3xl font-extrabold text-neutral-900">
                ${Number(product.price || 0).toFixed(2)}
              </p>
            </div>

            <div className="border-t border-b py-6 text-neutral-700 space-y-4">
              <p className="leading-relaxed">{product.description}</p>
            </div>

            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-3">Key Features</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-600">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4">
              <button className="w-full rounded-xl bg-neutral-900 px-6 py-4 text-center font-semibold text-white shadow-md hover:bg-neutral-800 transition-colors">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
