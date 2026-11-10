import { NextResponse } from "next/server";
import { hasValidBearerSecret } from "../../../../lib/api-secret";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  ingestItemSchema,
  toRow,
} from "../../../../lib/product-pipeline/ingest-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 512 * 1024;

export async function POST(request: Request) {
  if (!process.env.PRODUCT_PIPELINE_SECRET) {
    return NextResponse.json({ error: "Pipeline not configured." }, { status: 500 });
  }
  if (!hasValidBearerSecret(request, "PRODUCT_PIPELINE_SECRET")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }
  const text = await request.text();
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  // Validate per item so one bad product never rejects the whole batch.
  const body = json as { run_id?: unknown; items?: unknown } | null;
  const runId = typeof body?.run_id === "string" ? body.run_id.trim() : "";
  const rawItems = body?.items;
  if (
    !runId ||
    runId.length > 100 ||
    !Array.isArray(rawItems) ||
    rawItems.length === 0 ||
    rawItems.length > 25
  ) {
    return NextResponse.json(
      { error: "Expected { run_id: string, items: 1..25 }." },
      { status: 400 },
    );
  }

  const valid = new Map<string, ReturnType<typeof ingestItemSchema.parse>>();
  const rejected: { sku: string | null; errors: string[] }[] = [];
  for (const raw of rawItems) {
    const parsed = ingestItemSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({
        sku: typeof (raw as { sku?: unknown } | null)?.sku === "string" ? (raw as { sku: string }).sku : null,
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    } else {
      valid.set(parsed.data.sku, parsed.data); // last duplicate in batch wins
    }
  }

  if (valid.size === 0) {
    return NextResponse.json({ ok: false, upserted: 0, rejected }, { status: 422 });
  }

  const supabase = getSupabaseAdmin();
  const skus = [...valid.keys()];
  const { data: existing, error: lookupError } = await supabase
    .from("products")
    .select("sku, status")
    .eq("supplier_id", "cj")
    .in("sku", skus);
  if (lookupError) {
    console.error("pipeline lookup failed", lookupError.message);
    return NextResponse.json({ error: "Lookup failed." }, { status: 503 });
  }
  const statusBySku = new Map(
    (existing ?? []).map((r: { sku: string; status: string }) => [r.sku, r.status]),
  );

  const rows = [...valid.values()].map((item) => ({
    ...toRow(item, statusBySku.get(item.sku)),
    // stock is only written on insert-or-explicit; default 0, never a fake 100
    ...(item.stock_quantity !== undefined || !statusBySku.has(item.sku)
      ? { stock_quantity: item.stock_quantity ?? 0 }
      : {}),
  }));

  // Idempotent: re-sending the same batch converges on identical rows.
  const { error } = await supabase
    .from("products")
    .upsert(rows as never, { onConflict: "supplier_id,sku" });
  if (error) {
    console.error("pipeline upsert failed", error.message);
    // 503 => n8n retries (transient); a retry is safe because of the upsert.
    return NextResponse.json({ error: "Upsert failed." }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    run_id: runId,
    upserted: rows.length,
    created: rows.filter((r) => !statusBySku.has(r.sku)).length,
    rejected,
  });
}
