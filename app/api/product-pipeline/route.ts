// app/api/product-pipeline/route.ts
export const maxDuration = 60; // Allows up to 60 seconds for serverless execution

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
        try {
          await reader.cancel();
        } catch (error) {
          console.error("Could not cancel oversized product pipeline body:", error);
        }
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
  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

export async function POST(request: Request) {
  const pipelineSecret = process.env.PRODUCT_PIPELINE_SECRET;
  if (!pipelineSecret) {
    console.error("Product pipeline is not configured: missing shared secret.");
    return NextResponse.json(
      { error: "Product pipeline is not configured on this server." },
      { status: 500 },
    );
  }
  if (!hasValidToken(request, pipelineSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await readLimitedBody(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "Request body exceeds the 128 KB limit." },
        { status: 413 },
      );
    }
    if (error instanceof TypeError) {
      return NextResponse.json(
        { error: "Request body must be valid UTF-8." },
        { status: 400 },
      );
    }
    console.error("Could not read product pipeline request body:", error);
    return NextResponse.json(
      { error: "Could not read the request body." },
      { status: 400 },
    );
  }

  let product: any;
  try {
    product = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!product.sku) {
    return NextResponse.json({ error: "SKU is required." }, { status: 400 });
  }

  try {
    console.log(`Upserting product SKU: ${product.sku} to Supabase...`);

    // Strictly map to valid standard columns to prevent any schema cache errors
// Strictly map to valid standard columns including the required 'name' column
    const cleanRecord = {
      sku: product.sku,
      name: product.title || product.name || "Untitled Product", // Fixes the null constraint on 'name'
      title: product.title || "Untitled Product",
      description: product.description || "",
      category: product.category || "General",
      price: typeof product.price === "number" ? product.price : parseFloat(product.price) || 0,
      cost_price: typeof product.cost_price === "number" ? product.cost_price : parseFloat(product.cost_price) || 0,
      image_url: product.image_url || product.imageUrl || "",
      stock_quantity: typeof product.stock_quantity === "number" ? product.stock_quantity : parseInt(product.stock_quantity, 10) || 100,
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from("products")
      .upsert(cleanRecord, { onConflict: "sku" });

    if (dbError) {
      console.error("Supabase catalog sync failed:", dbError.message);
      return NextResponse.json(
        { error: "Could not save the enriched product to the catalog.", details: dbError.message },
        { status: 422 },
      );
    }

    console.log(`Successfully synced SKU: ${product.sku}`);
    return NextResponse.json({ success: true, sku: product.sku }, { status: 201 });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Product pipeline processing failed:", errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Could not enrich and sync the supplier product.", 
        details: errorMessage 
      },
      { status: 500 },
    );
  }
}