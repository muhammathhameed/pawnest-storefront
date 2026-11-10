import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { extractShipping } from "../shipping";
import {
  extractTopLevelValue,
  parse17TrackUpdate,
  poStatusForCarrierStatus,
  verify17TrackSignature,
} from "../tracking";
import { isAllowedSecretRef, verifyBearer, verifyHmacSha256 } from "../webhookAuth";

describe("HMAC webhook auth", () => {
  const body = '{"event":"inventory","items":[]}';
  const sig = createHmac("sha256", "s3cret").update(body).digest("hex");
  it("accepts a valid signature, with or without the sha256= prefix", () => {
    assert.ok(verifyHmacSha256(body, sig, "s3cret"));
    assert.ok(verifyHmacSha256(body, `sha256=${sig}`, "s3cret"));
    assert.ok(verifyHmacSha256(body, sig.toUpperCase(), "s3cret"));
  });
  it("rejects tampering, wrong secrets and missing input", () => {
    assert.ok(!verifyHmacSha256(body + " ", sig, "s3cret"));
    assert.ok(!verifyHmacSha256(body, sig, "other"));
    assert.ok(!verifyHmacSha256(body, null, "s3cret"));
    assert.ok(!verifyHmacSha256(body, sig, ""));
    assert.ok(!verifyHmacSha256(body, "short", "s3cret"));
  });
  it("only resolves SUPPLIER_* secret names and checks bearer tokens", () => {
    assert.ok(isAllowedSecretRef("SUPPLIER_ALPHA_API_KEY"));
    assert.ok(!isAllowedSecretRef("STRIPE_SECRET_KEY"));
    assert.ok(!isAllowedSecretRef("SUPABASE_SERVICE_ROLE_KEY"));
    assert.ok(!isAllowedSecretRef(null));
    assert.ok(verifyBearer("Bearer abc", "abc"));
    assert.ok(!verifyBearer("Bearer abd", "abc"));
    assert.ok(!verifyBearer("abc", "abc"));
    assert.ok(!verifyBearer("Bearer abc", undefined));
  });
});

describe("17TRACK webhooks", () => {
  // Spacing and key order here are deliberately unusual: the signature covers
  // the raw `data` text exactly as sent, so re-serializing would break it.
  const data = '{ "number" : "RR123", "carrier":3011,\n "track_info":{"latest_status":{"status":"Delivered","sub_status":"Delivered_Other"},"time_metrics":{"estimated_delivery_date":{"from":"2026-11-10T00:00:00Z","to":"2026-11-12T00:00:00Z"}},"tracking":{"providers":[{"events":[{"time_iso":"2026-11-09T10:00:00Z","description":"Delivered, left at \\"door\\"","location":"Leeds","stage":"Delivered"},{"time_iso":"2026-11-08T08:00:00Z","description":"Arrived","location":"Hub, {UK}","stage":"InTransit"}]}]}} }';
  const raw = `{"event":"TRACKING_UPDATED","data":${data}}`;
  const sign = (e: string, d: string, key: string) =>
    createHash("sha256").update(`${e}/${d}/${key}`).digest("hex");

  it("extracts the raw data text byte for byte", () => {
    assert.equal(extractTopLevelValue(raw, "data"), data);
    assert.equal(extractTopLevelValue('{"a":"x}","data":[1,{"b":"]"}]}', "data"), '[1,{"b":"]"}]');
    assert.equal(extractTopLevelValue('{"a":1}', "data"), null);
  });
  it("verifies the signature over the raw data, hex or base64", () => {
    assert.ok(verify17TrackSignature(raw, sign("TRACKING_UPDATED", data, "k"), "k"));
    const b64 = createHash("sha256").update(`TRACKING_UPDATED/${data}/k`).digest("base64");
    assert.ok(verify17TrackSignature(raw, b64, "k"));
  });
  it("rejects wrong keys, tampered bodies and missing headers", () => {
    const good = sign("TRACKING_UPDATED", data, "k");
    assert.ok(!verify17TrackSignature(raw, good, "wrong"));
    assert.ok(!verify17TrackSignature(raw.replace("RR123", "RR124"), good, "k"));
    assert.ok(!verify17TrackSignature(raw, null, "k"));
    assert.ok(!verify17TrackSignature("not json", good, "k"));
    assert.ok(!verify17TrackSignature('{"data":{}}', good, "k"));
  });
  it("parses status, ETA and events (oldest first)", () => {
    const update = parse17TrackUpdate(raw)!;
    assert.equal(update.trackingNumber, "RR123");
    assert.equal(update.carrierCode, "3011");
    assert.equal(update.status, "Delivered");
    assert.equal(update.estimatedDeliveryTo?.toISOString(), "2026-11-12T00:00:00.000Z");
    assert.deepEqual(update.events.map((e) => e.stage), ["InTransit", "Delivered"]);
    assert.equal(update.events[0].location, "Hub, {UK}");
    assert.equal(update.events[1].description, 'Delivered, left at "door"');
  });
  it("returns null instead of throwing on unexpected shapes", () => {
    assert.equal(parse17TrackUpdate("nope"), null);
    assert.equal(parse17TrackUpdate('{"event":"X","data":{}}'), null);
    assert.equal(parse17TrackUpdate('{"event":"X"}'), null);
    const bare = parse17TrackUpdate('{"event":"TRACKING_UPDATED","data":{"number":"A"}}')!;
    assert.equal(bare.status, null);
    assert.deepEqual(bare.events, []);
  });
  it("maps carrier statuses to PO statuses", () => {
    assert.equal(poStatusForCarrierStatus("InTransit"), "shipped");
    assert.equal(poStatusForCarrierStatus("OutForDelivery"), "shipped");
    assert.equal(poStatusForCarrierStatus("Delivered"), "delivered");
    assert.equal(poStatusForCarrierStatus("Exception"), "exception");
    assert.equal(poStatusForCarrierStatus("DeliveryFailure"), "exception");
    assert.equal(poStatusForCarrierStatus("InfoReceived"), null);
    assert.equal(poStatusForCarrierStatus("NotFound"), null);
    assert.equal(poStatusForCarrierStatus(null), null);
  });
});

describe("Stripe shipping extraction", () => {
  const address = { line1: " 9 Elm St ", city: "Leeds", postal_code: "LS1 4AB", country: "gb", state: null, line2: "" };
  it("reads the current and legacy Stripe shapes", () => {
    const modern = extractShipping({
      customer_details: { name: "Sam", phone: "+441234" },
      collected_information: { shipping_details: { name: "Sam Q", address } },
    })!;
    assert.equal(modern.name, "Sam Q");
    assert.equal(modern.address.line1, "9 Elm St");
    assert.equal(modern.address.country, "GB");
    assert.equal(modern.address.line2, null);
    assert.equal(modern.phone, "+441234");
    const legacy = extractShipping({ shipping_details: { name: "Pat", address } })!;
    assert.equal(legacy.name, "Pat");
  });
  it("falls back to the customer name and rejects incomplete addresses", () => {
    assert.equal(extractShipping({ customer_details: { name: "Sam" }, shipping_details: { address } })!.name, "Sam");
    assert.equal(extractShipping({ shipping_details: { name: "A", address: { ...address, city: "" } } }), null);
    assert.equal(extractShipping({ shipping_details: { name: "A", address: { ...address, country: "GBR" } } }), null);
    assert.equal(extractShipping({ shipping_details: { address } }), null);
    assert.equal(extractShipping({}), null);
  });
});
