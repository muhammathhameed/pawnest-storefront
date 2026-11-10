import "server-only";
import { isUniqueViolation, must, type DropshipDb } from "../db";
import { recordOrderEvent, refreshOrderStatus } from "../rollup";
import { assertPoTransition, canTransitionPo, type PoStatus } from "../stateMachine";
import { poStatusForCarrierStatus, type TrackingUpdate } from "../tracking";
import { resolveSecret } from "../supplierClient";

interface PoRow {
  id: string;
  order_id: string;
  status: PoStatus;
  tracking_number: string | null;
  shipped_at: string | null;
}

/** Applies a normalized carrier update to the matching PO. Idempotent. */
export async function applyTrackingUpdate(db: DropshipDb, update: TrackingUpdate) {
  const pos = must(
    await db
      .from("supplier_orders")
      .select("id, order_id, status, tracking_number, shipped_at")
      .eq("tracking_number", update.trackingNumber),
    "find PO by tracking number",
  ) as PoRow[];
  if (pos.length === 0) return { matched: 0 };

  for (const po of pos) {
    for (const event of update.events) {
      const { error } = await db.from("tracking_events").insert({
        supplier_order_id: po.id,
        tracking_number: update.trackingNumber,
        carrier: update.carrierCode,
        status: event.stage ?? update.status ?? "Unknown",
        sub_status: event.subStatus,
        description: event.description,
        location: event.location,
        occurred_at: event.occurredAt.toISOString(),
      });
      if (error && !isUniqueViolation(error)) throw error;
    }

    const target = poStatusForCarrierStatus(update.status);
    if (!target || target === po.status) continue;

    // A parcel can jump straight to Delivered; walk the legal path.
    const path: PoStatus[] =
      target === "delivered" && po.status !== "shipped" && po.status !== "exception"
        ? ["shipped", "delivered"]
        : [target];

    let current = po.status;
    for (const step of path) {
      if (current === step) continue;
      if (!canTransitionPo(current, step)) break;
      assertPoTransition(current, step);
      const now = new Date().toISOString();
      must(
        await db
          .from("supplier_orders")
          .update({
            status: step,
            ...(step === "shipped" && !po.shipped_at ? { shipped_at: now } : {}),
            ...(step === "delivered" ? { delivered_at: now } : {}),
            ...(step === "exception" ? { failure_reason: update.subStatus ?? "carrier_exception" } : {}),
          })
          .eq("id", po.id)
          .eq("status", current),
        `move PO to ${step}`,
      );
      await recordOrderEvent(db, po.order_id, `po.${step}`, { carrier_status: update.status }, po.id);
      current = step;
    }
    await refreshOrderStatus(db, po.order_id);
  }
  return { matched: pos.length };
}

/** Registers a tracking number with 17TRACK so it starts pushing updates. */
export async function registerTrackingNumber(db: DropshipDb, supplierOrderId: string) {
  const po = must(
    await db
      .from("supplier_orders")
      .select("id, tracking_number, carrier, tracking_registered_at")
      .eq("id", supplierOrderId)
      .maybeSingle(),
    "load PO to register tracking",
  ) as { id: string; tracking_number: string | null; carrier: string | null; tracking_registered_at: string | null } | null;
  if (!po?.tracking_number) return { skipped: "no_tracking_number" };
  if (po.tracking_registered_at) return { skipped: "already_registered" };

  const apiKey = resolveSecretEnv("TRACKING_17TRACK_API_KEY");
  if (!apiKey) return { skipped: "17track_not_configured" };

  const response = await fetch("https://api.17track.net/track/v2.2/register", {
    method: "POST",
    headers: { "content-type": "application/json", "17token": apiKey },
    body: JSON.stringify([{ number: po.tracking_number }]),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`17TRACK register failed: HTTP ${response.status}`);

  const body = (await response.json().catch(() => null)) as
    | { data?: { rejected?: Array<{ error?: { code?: number; message?: string } }> } }
    | null;
  const rejected = body?.data?.rejected?.[0]?.error;
  // 17TRACK reports "already registered" as a rejection; that is success for us.
  const alreadyRegistered = /already registered/i.test(rejected?.message ?? "");
  if (rejected && !alreadyRegistered) {
    throw new Error(`17TRACK rejected ${po.tracking_number}: ${rejected.message ?? rejected.code}`);
  }

  must(
    await db
      .from("supplier_orders")
      .update({ tracking_registered_at: new Date().toISOString() })
      .eq("id", po.id),
    "mark tracking registered",
  );
  return { registered: true };
}

function resolveSecretEnv(name: string): string | null {
  return process.env[name] ?? null;
}

// Re-exported so callers can share one secret resolver implementation.
export { resolveSecret };
