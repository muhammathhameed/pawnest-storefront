import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Verifies a supplier webhook: hex HMAC-SHA256 of the raw request body.
 * Accepts an optional "sha256=" prefix. Always compares in constant time.
 */
export function verifyHmacSha256(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const provided = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(provided, expected);
}

/** Secret references must name a SUPPLIER_* variable, never an arbitrary one. */
export function isAllowedSecretRef(ref: string | null | undefined): ref is string {
  return typeof ref === "string" && /^SUPPLIER_[A-Z0-9_]{1,60}$/.test(ref);
}

/** Constant-time bearer token check for cron/worker endpoints. */
export function verifyBearer(
  header: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!header || !expectedToken) return false;
  const match = /^Bearer (.+)$/.exec(header);
  return match ? safeEqual(match[1], expectedToken) : false;
}
