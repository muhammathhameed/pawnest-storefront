import { createHash, timingSafeEqual } from "node:crypto";
import type { PoStatus } from "./stateMachine";

/**
 * 17TRACK webhook handling (API v2.2). The provider interface is deliberately
 * small so AfterShip can be added later by implementing the same shapes.
 *
 * Signature (per 17TRACK's push docs): the `sign` header is
 *   sha256(event + "/" + <the raw `data` JSON exactly as sent> + "/" + apiKey)
 * We therefore verify against the raw text of `data`, not a re-serialization.
 * The digest encoding is not stated in every doc, so hex and base64 are both
 * accepted. Confirm both the header name and encoding with a test push from
 * your 17TRACK dashboard before going live.
 */

function skipWhitespace(text: string, index: number): number {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

function scanString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === "\\") i += 2;
    else if (text[i] === '"') return i + 1;
    else i += 1;
  }
  throw new SyntaxError("Unterminated JSON string");
}

function scanValue(text: string, start: number): number {
  const first = text[start];
  if (first === '"') return scanString(text, start);
  if (first === "{" || first === "[") {
    let depth = 0;
    let i = start;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '"') {
        i = scanString(text, i);
        continue;
      }
      if (ch === "{" || ch === "[") depth += 1;
      if (ch === "}" || ch === "]") {
        depth -= 1;
        if (depth === 0) return i + 1;
      }
      i += 1;
    }
    throw new SyntaxError("Unterminated JSON container");
  }
  let i = start;
  while (i < text.length && !/[\s,}\]]/.test(text[i])) i += 1;
  return i;
}

/** Returns the raw source text of a top-level key's value, untouched. */
export function extractTopLevelValue(raw: string, key: string): string | null {
  let i = skipWhitespace(raw, 0);
  if (raw[i] !== "{") return null;
  i += 1;
  while (i < raw.length) {
    i = skipWhitespace(raw, i);
    if (raw[i] === "}") return null;
    if (raw[i] === ",") {
      i += 1;
      continue;
    }
    if (raw[i] !== '"') return null;
    const keyEnd = scanString(raw, i);
    const name = JSON.parse(raw.slice(i, keyEnd)) as string;
    i = skipWhitespace(raw, keyEnd);
    if (raw[i] !== ":") return null;
    i = skipWhitespace(raw, i + 1);
    const valueEnd = scanValue(raw, i);
    if (name === key) return raw.slice(i, valueEnd);
    i = valueEnd;
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verify17TrackSignature(
  rawBody: string,
  signHeader: string | null,
  apiKey: string,
): boolean {
  if (!signHeader || !apiKey) return false;
  let parsed: { event?: unknown; data?: unknown };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  if (typeof parsed.event !== "string") return false;

  let rawData: string | null = null;
  try {
    rawData = extractTopLevelValue(rawBody, "data");
  } catch {
    rawData = null;
  }
  const candidates = [rawData, JSON.stringify(parsed.data)].filter(
    (value): value is string => typeof value === "string",
  );

  const provided = signHeader.trim();
  for (const data of candidates) {
    const digest = createHash("sha256")
      .update(`${parsed.event}/${data}/${apiKey}`)
      .digest();
    if (
      safeEqual(provided.toLowerCase(), digest.toString("hex")) ||
      safeEqual(provided, digest.toString("base64"))
    ) {
      return true;
    }
  }
  return false;
}

export type CarrierStatus =
  | "NotFound"
  | "InfoReceived"
  | "InTransit"
  | "AvailableForPickup"
  | "OutForDelivery"
  | "DeliveryFailure"
  | "Delivered"
  | "Exception"
  | "Expired";

export interface TrackingEvent {
  occurredAt: Date;
  description: string | null;
  location: string | null;
  stage: string | null;
  subStatus: string | null;
}

export interface TrackingUpdate {
  event: string;
  trackingNumber: string;
  carrierCode: string | null;
  status: string | null;
  subStatus: string | null;
  estimatedDeliveryFrom: Date | null;
  estimatedDeliveryTo: Date | null;
  events: TrackingEvent[];
}

type Json = Record<string, unknown>;
const asObject = (value: unknown): Json | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const asDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Defensive parse: unknown shapes yield null instead of throwing. */
export function parse17TrackUpdate(rawBody: string): TrackingUpdate | null {
  let root: Json | null;
  try {
    root = asObject(JSON.parse(rawBody));
  } catch {
    return null;
  }
  const event = asString(root?.event);
  const data = asObject(root?.data);
  const number = asString(data?.number);
  if (!root || !event || !data || !number) return null;

  const info = asObject(data.track_info);
  const latest = asObject(info?.latest_status);
  const metrics = asObject(asObject(info?.time_metrics)?.estimated_delivery_date);
  const providers = Array.isArray(asObject(info?.tracking)?.providers)
    ? (asObject(info?.tracking)?.providers as unknown[])
    : [];

  const events: TrackingEvent[] = [];
  for (const provider of providers) {
    const list = asObject(provider)?.events;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const entry = asObject(item);
      const occurredAt = asDate(entry?.time_iso);
      if (!entry || !occurredAt) continue;
      events.push({
        occurredAt,
        description: asString(entry.description),
        location: asString(entry.location),
        stage: asString(entry.stage),
        subStatus: asString(entry.sub_status),
      });
    }
  }
  events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const carrier = data.carrier;
  return {
    event,
    trackingNumber: number,
    carrierCode:
      typeof carrier === "number" || typeof carrier === "string" ? String(carrier) : null,
    status: asString(latest?.status),
    subStatus: asString(latest?.sub_status),
    estimatedDeliveryFrom: asDate(metrics?.from),
    estimatedDeliveryTo: asDate(metrics?.to),
    events,
  };
}

/**
 * Maps a carrier status to the PO status it implies. null means "no change"
 * (label created, or carrier has not seen the parcel yet).
 */
export function poStatusForCarrierStatus(
  status: string | null,
): Extract<PoStatus, "shipped" | "delivered" | "exception"> | null {
  switch (status) {
    case "InTransit":
    case "OutForDelivery":
    case "AvailableForPickup":
      return "shipped";
    case "Delivered":
      return "delivered";
    case "DeliveryFailure":
    case "Exception":
    case "Expired":
      return "exception";
    default:
      return null;
  }
}
