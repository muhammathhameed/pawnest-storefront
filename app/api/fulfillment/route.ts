import { NextResponse } from "next/server";
import {
  FulfillmentError,
  submitCJFulfillment,
} from "../../../lib/cj-fulfillment";
import {
  hasValidBearerSecret,
  isSecretConfigured,
} from "../../../lib/api-secret";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSecretConfigured("CJ_FULFILLMENT_SECRET")) {
    return NextResponse.json(
      { error: "CJ fulfillment endpoint is not configured." },
      { status: 500 },
    );
  }
  if (!hasValidBearerSecret(request, "CJ_FULFILLMENT_SECRET")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const orderId =
    typeof payload === "object" &&
    payload !== null &&
    "orderId" in payload &&
    typeof payload.orderId === "string"
      ? payload.orderId.trim()
      : "";
  if (!orderId || orderId.length > 128) {
    return NextResponse.json(
      { error: "A valid orderId is required." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await submitCJFulfillment(orderId));
  } catch (error) {
    if (error instanceof FulfillmentError) {
      return NextResponse.json(
        { error: error.message, lowBalance: error.lowBalance },
        { status: error.status },
      );
    }
    console.error("Unexpected CJ fulfillment endpoint failure.");
    return NextResponse.json(
      { error: "Could not process fulfillment." },
      { status: 500 },
    );
  }
}
