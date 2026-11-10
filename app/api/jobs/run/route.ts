import { NextResponse } from "next/server";
import { verifyBearer } from "../../../../lib/dropship/webhookAuth";
import { getDropshipDb, must } from "../../../../lib/dropship/db";
import { processJobs } from "../../../../lib/dropship/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Worker tick. Vercel Cron calls this every minute with
 * `Authorization: Bearer $CRON_SECRET`; it can also be hit by any scheduler.
 * A "sweep" job is enqueued at most once per 5 minutes (deduped by bucket).
 */
async function handle(request: Request) {
  if (!verifyBearer(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const db = getDropshipDb();
    const bucket = Math.floor(Date.now() / (5 * 60_000));
    must(
      await db.rpc("enqueue_job", {
        p_type: "sweep",
        p_payload: {},
        p_run_at: new Date().toISOString(),
        p_dedupe_key: `sweep:${bucket}`,
      }),
      "enqueue sweep",
    );
    return NextResponse.json(await processJobs());
  } catch (error) {
    console.error("Job runner failed:", error);
    return NextResponse.json({ error: "Job runner failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
