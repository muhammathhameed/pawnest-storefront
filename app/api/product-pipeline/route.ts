// app/api/product-pipeline/route.ts
export const maxDuration = 60;

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const MAX_REQUEST_BYTES = 128 * 1024;
class RequestBodyTooLargeError extends Error {}

async function readLimitedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        try { await reader.cancel(); } catch {}
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

function hasValidToken(request: Request, expectedToken: string): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) return false;
  const received = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const pipelineSecret = process.env.PRODUCT_PIPELINE_SECRET;
  if (!pipelineSecret || !hasValidToken(request, pipelineSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rawBody = await readLimitedBody(request);
    const product: any = JSON.parse(rawBody);

    if (!product.sku) {
      return NextResponse.json({ error: "SKU is required." }, { status: 400 });
    }

    console.log(`Upserting product SKU: ${product.sku} to Supabase...`);

    const { error: dbError } = await supabase
      .from("products")
      .upsert(
        {
          sku: product.sku,
          supplier_id: product.supplier_id || product.sku,
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          cost_price: product.cost_price,
          image_url: product.image_url || product.imageUrl,
          supplier_name: product.supplier_name || "CJ Dropshipping",
          inventory_count: product.inventory_count || 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sku" }
      );

    if (dbError) {
      console.error("Supabase upsert failed:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 422 });
    }

    console.log(`Successfully synced SKU: ${product.sku}`);
    return NextResponse.json({ success: true, sku: product.sku }, { status: 201 });
  } catch (error: any) {
    console.error("Pipeline error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}