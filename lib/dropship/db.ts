import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../supabaseAdmin";

/**
 * The generated Database type predates the dropship tables, so the dropship
 * layer uses an untyped service-role client. Row shapes are declared next to
 * the code that reads them. Server-only: this client bypasses RLS.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DropshipDb = SupabaseClient<any, "public", any>;

export function getDropshipDb(): DropshipDb {
  return getSupabaseAdmin() as unknown as DropshipDb;
}

export class DbError extends Error {
  constructor(context: string, public readonly cause: unknown) {
    const message =
      cause && typeof cause === "object" && "message" in cause
        ? String((cause as { message: unknown }).message)
        : String(cause);
    super(`${context}: ${message}`);
    this.name = "DbError";
  }
}

/** Unwraps a supabase-js response, throwing a descriptive error on failure. */
export function must<T>(
  result: { data: T | null; error: unknown },
  context: string,
): T {
  if (result.error) throw new DbError(context, result.error);
  return result.data as T;
}

export function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && (error as { code?: string }).code === "23505",
  );
}
