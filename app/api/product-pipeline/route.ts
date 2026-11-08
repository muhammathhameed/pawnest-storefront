// app/api/product-pipeline/route.ts
export const maxDuration = 60; // Allows up to 60 seconds for serverless execution

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ProductPipelineConfigurationError,
  ProductPipelineSyncError,
  ProductPipelineValidationError,
} from "@/lib/product-pipeline/errors";
import { processSupplierProduct } from "@/lib/product-pipeline/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  let rawProduct: unknown;
  try {
    rawProduct = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const product = await processSupplierProduct(rawProduct);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductPipelineValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ProductPipelineConfigurationError) {
      console.error("Product pipeline configuration error:", error.message);
      return NextResponse.json(
        { error: "Product pipeline dependencies are not configured.", details: error.message },
        { status: 503 },
      );
    }
    if (error instanceof ProductPipelineSyncError) {
      console.error("Product catalog sync failed:", error.message);
      return NextResponse.json(
        { error: "Could not save the enriched product to the catalog.", details: error.message },
        { status: 422 },
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Product pipeline processing failed:", errorMessage, errorStack);
    
    // Returns detailed error JSON instead of a silent 502 gateway crash
    return NextResponse.json(
      { 
        success: false, 
        error: "Could not enrich and sync the supplier product.", 
        details: errorMessage,
        stack: errorStack
      },
      { status: 500 },
    );
  }
}