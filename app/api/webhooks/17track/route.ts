import { NextResponse } from "next/server";
import { getDropshipDb } from "../../../../lib/dropship/db";
import { parse17TrackUpdate, verify17TrackSignature } from "../../../../lib/dropship/tracking";
import { applyTrackingUpdate } from "../../../../lib/dropship/jobs/trackingSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 17TRACK push endpoint. Register this URL in the 17TRACK dashboard. */
export async function POST(request: Request) {
  const apiKey = process.env.TRACKING_17TRACK_API_KEY;
  if (!apiKey) {
    console.error("TRACKING_17TRACK_API_KEY is not configured.");
    return NextResponse.json({ error: "Webhook endpoint is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verify17TrackSignature(rawBody, request.headers.get("sign"), apiKey)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const update = parse17TrackUpdate(rawBody);
  // Unknown shapes and TRACKING_STOPPED are acknowledged so 17TRACK stops retrying.
  if (!update || update.event !== "TRACKING_UPDATED") {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const result = await applyTrackingUpdate(getDropshipDb(), update);
    return NextResponse.json({ received: true, matched: result.matched });
  } catch (error) {
    console.error("Could not apply tracking update:", error);
    return NextResponse.json({ error: "Could not process tracking update." }, { status: 500 });
  }
}
