import "server-only";
import { isAllowedSecretRef } from "./webhookAuth";
import type { SupplierShipmentPayload } from "./blind";

export interface SupplierRow {
  id: string;
  code: string;
  name: string;
  status: string;
  integration_type: "manual" | "http";
  api_base_url: string | null;
  api_key_ref: string | null;
  webhook_secret_ref: string | null;
  ships_from_country: string | null;
  handling_days: number;
  supports_blind_shipping: boolean;
}

export type PlaceResult =
  | { kind: "placed"; externalPoId: string | null }
  /** Nothing to call: a person must place this PO by hand. */
  | { kind: "manual" }
  /** Supplier rejected the order for good; reroute. */
  | { kind: "rejected"; reason: string }
  /** Network/5xx/429: safe to retry with the same idempotency key. */
  | { kind: "retry"; reason: string };

const TIMEOUT_MS = 15_000;

export function resolveSecret(ref: string | null): string | null {
  if (!isAllowedSecretRef(ref)) return null;
  return process.env[ref] ?? null;
}

/** Only https endpoints, and never loopback/private hosts, to limit SSRF. */
export function isSafeSupplierUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return !(
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) ||
      host === "::1" ||
      host.startsWith("[")
    );
  } catch {
    return false;
  }
}

export async function placePurchaseOrder(
  supplier: SupplierRow,
  payload: SupplierShipmentPayload,
): Promise<PlaceResult> {
  if (supplier.integration_type === "manual") return { kind: "manual" };

  if (!supplier.api_base_url || !isSafeSupplierUrl(supplier.api_base_url)) {
    return { kind: "rejected", reason: "supplier_endpoint_invalid" };
  }
  const apiKey = resolveSecret(supplier.api_key_ref);
  if (!apiKey) return { kind: "rejected", reason: "supplier_api_key_missing" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      new URL("orders", supplier.api_base_url.replace(/\/?$/, "/")),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "idempotency-key": payload.idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "error",
      },
    );

    if (response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { id?: unknown; order_id?: unknown }
        | null;
      const id = body?.id ?? body?.order_id;
      return {
        kind: "placed",
        externalPoId: typeof id === "string" || typeof id === "number" ? String(id) : null,
      };
    }
    if (response.status === 408 || response.status === 429 || response.status >= 500) {
      return { kind: "retry", reason: `supplier_http_${response.status}` };
    }
    return { kind: "rejected", reason: `supplier_http_${response.status}` };
  } catch (error) {
    return {
      kind: "retry",
      reason: error instanceof Error ? error.name : "supplier_request_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
