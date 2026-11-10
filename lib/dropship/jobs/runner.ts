import "server-only";
import { revalidateTag } from "next/cache";
import { getDropshipDb, must, type DropshipDb } from "../db";
import { CATALOG_TAG, productTag } from "../inventory";
import { placeSupplierOrder, TransientSupplierError } from "./placePo";
import { repriceVariant } from "./reprice";
import { routeOrder } from "./routeOrder";
import { runSweep } from "./sweep";
import { registerTrackingNumber } from "./trackingSync";

interface JobRow {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

type Handler = (db: DropshipDb, payload: Record<string, unknown>) => Promise<unknown>;

function str(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Job payload is missing "${key}"`);
  }
  return value;
}

export const handlers: Record<string, Handler> = {
  "order.route": (db, p) => routeOrder(db, str(p, "orderId")),
  "po.place": (db, p) => placeSupplierOrder(db, str(p, "supplierOrderId")),
  "variant.reprice": async (db, p) => {
    const result = await repriceVariant(db, str(p, "variantId"));
    if ("productId" in result && result.productId) purgeCatalogCache([String(result.productId)]);
    return result;
  },
  "tracking.register": (db, p) => registerTrackingNumber(db, str(p, "supplierOrderId")),
  "sweep": (db) => runSweep(db),
};

/** Purges storefront caches for the given products plus the catalog listing. */
export function purgeCatalogCache(productIds: string[]) {
  revalidateTag(CATALOG_TAG);
  for (const id of productIds) revalidateTag(productTag(id));
}

/** Exponential backoff with a cap: 30s, 1m, 2m, 4m ... 1h. */
export function backoffSeconds(attempt: number): number {
  return Math.min(30 * 2 ** Math.max(attempt - 1, 0), 3600);
}

export async function processJobs(limit = 10, budgetMs = 45_000) {
  const db = getDropshipDb();
  const started = Date.now();
  const stats = { claimed: 0, done: 0, retried: 0, dead: 0 };

  const jobs = must(await db.rpc("claim_jobs", { p_limit: limit }), "claim jobs") as JobRow[];
  stats.claimed = jobs.length;

  for (const job of jobs) {
    if (Date.now() - started > budgetMs) {
      // Out of time: hand the job back untouched for the next tick.
      await db.rpc("fail_job", { p_id: job.id, p_error: "deferred: time budget", p_retry_in_seconds: 1 });
      continue;
    }
    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`No handler for job type "${job.type}"`);
      await handler(db, job.payload ?? {});
      must(await db.rpc("complete_job", { p_id: job.id }), "complete job");
      stats.done += 1;
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.error(`Job ${job.id} (${job.type}) failed:`, message);
      await db.rpc("fail_job", {
        p_id: job.id,
        p_error: message,
        p_retry_in_seconds: backoffSeconds(job.attempts),
      });
      if (job.attempts >= job.max_attempts) stats.dead += 1;
      else stats.retried += 1;
    }
  }
  return stats;
}

export { TransientSupplierError };
