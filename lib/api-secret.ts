import "server-only";
import { timingSafeEqual } from "node:crypto";

export function hasValidBearerSecret(
  request: Request,
  environmentVariable: string,
): boolean {
  const expected = process.env[environmentVariable];
  const authorization = request.headers.get("authorization");
  const provided = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export function isSecretConfigured(environmentVariable: string): boolean {
  return Boolean(process.env[environmentVariable]?.trim());
}
