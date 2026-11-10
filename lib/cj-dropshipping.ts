import "server-only";

const CJ_API_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_TOKEN_URL = `${CJ_API_BASE_URL}/authentication/getAccessToken`;
const CJ_ACCESS_TOKEN_HEADER = "CJ-Access-Token";
const REQUEST_TIMEOUT_MS = 10_000;

interface CJEnvelope<T> {
  code: number;
  result: boolean;
  message: string;
  data: T | null;
  requestId?: string;
}

interface CJTokenData {
  accessToken: string;
  accessTokenExpiryDate?: string;
}

interface CJOrderResponse {
  orderId?: string;
  cjOrderId?: string;
  orderNumber?: string;
}

interface CJOrderDetail {
  orderId?: string;
  orderStatus?: string;
  trackNumber?: string | null;
  trackingNumber?: string | null;
  trackingProvider?: string | null;
}

export interface CJOrderItem {
  variantId: string;
  quantity: number;
}

export interface CJShippingAddress {
  name: string;
  email: string;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province: string;
  countryCode: string;
  country: string;
  postalCode?: string | null;
}

export interface CJOrderData {
  orderNumber: string;
  shippingAddress: CJShippingAddress;
  items: CJOrderItem[];
}

export interface CJOrderTracking {
  trackingNumber: string | null;
  carrier: string | null;
  orderStatus: string | null;
}

export class CJDropshippingError extends Error {
  readonly code: number | null;
  readonly lowBalance: boolean;
  readonly outcomeUnknown: boolean;

  constructor(
    message: string,
    code: number | null = null,
    outcomeUnknown = false,
  ) {
    super(message);
    this.name = "CJDropshippingError";
    this.code = code;
    this.outcomeUnknown = outcomeUnknown;
    this.lowBalance =
      /insufficient|low balance|balance is not enough|not enough balance|wallet/i.test(
        message,
      );
  }
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;
let tokenRequest: Promise<string> | null = null;
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

async function waitForRequestSlot() {
  let release = () => {};
  const previousRequest = requestQueue;
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previousRequest;
  try {
    const delay = Math.max(0, 1_000 - (Date.now() - lastRequestAt));
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    lastRequestAt = Date.now();
  } finally {
    release();
  }
}

function getCJConfig() {
  const accountEmail = process.env.CJ_ACCOUNT_EMAIL?.trim();
  const apiKey = process.env.CJ_API_KEY?.trim();

  if (!accountEmail || !apiKey) {
    throw new Error(
      "CJ_ACCOUNT_EMAIL and CJ_API_KEY are required for CJ Dropshipping.",
    );
  }

  return { accountEmail, apiKey };
}

function getFulfillmentConfig() {
  const logisticName = process.env.CJ_DEFAULT_LOGISTIC_NAME?.trim();
  const fromCountryCode =
    process.env.CJ_FROM_COUNTRY_CODE?.trim().toUpperCase() || "CN";

  if (!logisticName) {
    throw new Error(
      "CJ_DEFAULT_LOGISTIC_NAME is required to select the CJ shipping method.",
    );
  }
  if (!/^[A-Z]{2}$/.test(fromCountryCode)) {
    throw new Error("CJ_FROM_COUNTRY_CODE must be a two-letter country code.");
  }

  return { logisticName, fromCountryCode };
}

async function readEnvelope<T>(
  response: Response,
  operation: string,
  ambiguousOnServerError = false,
): Promise<CJEnvelope<T>> {
  let payload: CJEnvelope<T>;
  try {
    payload = (await response.json()) as CJEnvelope<T>;
  } catch {
    throw new CJDropshippingError(
      `CJ ${operation} returned an invalid response (HTTP ${response.status}).`,
      null,
      ambiguousOnServerError,
    );
  }

  if (
    !response.ok ||
    payload.result !== true ||
    payload.code !== 200 ||
    payload.data === null
  ) {
    throw new CJDropshippingError(
      payload.message || `CJ ${operation} failed (HTTP ${response.status}).`,
      Number.isFinite(payload.code) ? payload.code : null,
      (ambiguousOnServerError && response.status >= 500) ||
        (ambiguousOnServerError &&
          payload.result === true &&
          payload.data === null),
    );
  }
  return payload;
}

async function getAccessToken(): Promise<string> {
  getCJConfig();
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    const { apiKey } = getCJConfig();
    let response: Response;
    try {
      await waitForRequestSlot();
      response = await fetch(CJ_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new CJDropshippingError(
        "Could not connect to CJ authentication. Try again later.",
      );
    }

    const { data } = await readEnvelope<CJTokenData>(
      response,
      "authentication",
    );
    if (!data.accessToken) {
      throw new CJDropshippingError(
        "CJ authentication response did not include an access token.",
      );
    }

    cachedAccessToken = data.accessToken;
    const expiry = data.accessTokenExpiryDate
      ? Date.parse(data.accessTokenExpiryDate)
      : Number.NaN;
    tokenExpiresAt = Number.isFinite(expiry)
      ? expiry
      : Date.now() + 60 * 60 * 1000;
    return cachedAccessToken;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

async function cjRequest<T>(
  path: string,
  operation: string,
  init: RequestInit,
  ambiguousOnTransportFailure = false,
): Promise<T> {
  const token = await getAccessToken();
  let response: Response;
  try {
    await waitForRequestSlot();
    response = await fetch(`${CJ_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        [CJ_ACCESS_TOKEN_HEADER]: token,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new CJDropshippingError(
      `Could not connect to CJ ${operation}. Try again later.`,
      null,
      ambiguousOnTransportFailure,
    );
  }

  const { data } = await readEnvelope<T>(
    response,
    operation,
    ambiguousOnTransportFailure,
  );
  return data;
}

export async function createCJOrder(
  orderData: CJOrderData,
): Promise<{ cjOrderId: string }> {
  const { logisticName, fromCountryCode } = getFulfillmentConfig();
  if (!orderData.items.length) {
    throw new CJDropshippingError("Cannot create a CJ order without items.");
  }

  const address = orderData.shippingAddress;
  const addressFields = [
    [orderData.orderNumber, 50],
    [address.name, 50],
    [address.email, 50],
    [address.address1, 500],
    [address.address2 ?? "", 500],
    [address.city, 50],
    [address.province, 50],
    [address.country, 50],
    [address.phone ?? "", 20],
    [address.postalCode ?? "", 20],
  ] as const;
  if (addressFields.some(([value, maxLength]) => value.length > maxLength)) {
    throw new CJDropshippingError(
      "Order shipping details exceed a CJ field length limit.",
    );
  }

  const quantityByVariant = new Map<string, number>();
  for (const item of orderData.items) {
    if (
      !item.variantId.trim() ||
      item.variantId.length > 50 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new CJDropshippingError(
        "Order contains an invalid CJ variant or quantity.",
      );
    }
    quantityByVariant.set(
      item.variantId,
      (quantityByVariant.get(item.variantId) ?? 0) + item.quantity,
    );
  }
  if (quantityByVariant.size > 20) {
    throw new CJDropshippingError(
      "CJ orders support at most 20 distinct variants.",
    );
  }
  const response = await cjRequest<CJOrderResponse>(
    "/shopping/order/createOrderV2",
    "order creation",
    {
      method: "POST",
      body: JSON.stringify({
        orderNumber: orderData.orderNumber,
        shippingCountryCode: address.countryCode,
        shippingCountry: address.country,
        shippingProvince: address.province,
        shippingCity: address.city,
        shippingZip: address.postalCode ?? "",
        shippingPhone: address.phone ?? "",
        shippingCustomerName: address.name,
        shippingAddress: address.address1,
        shippingAddress2: address.address2 ?? "",
        email: address.email,
        logisticName,
        fromCountryCode,
        payType: 2,
        orderFlow: 1,
        platform: "Api",
        products: [...quantityByVariant].map(([variantId, quantity]) => ({
          vid: variantId,
          quantity,
        })),
      }),
    },
    true,
  );
  const cjOrderId = response.cjOrderId ?? response.orderId;
  if (!cjOrderId) {
    throw new CJDropshippingError(
      "CJ accepted the order but did not return an order ID.",
      null,
      true,
    );
  }
  return { cjOrderId };
}

export async function getCJOrderTracking(
  cjOrderId: string,
): Promise<CJOrderTracking> {
  const query = new URLSearchParams({ orderId: cjOrderId });
  const detail = await cjRequest<CJOrderDetail>(
    `/shopping/order/getOrderDetail?${query.toString()}`,
    "order tracking lookup",
    { method: "GET" },
  );

  return {
    trackingNumber: detail.trackNumber ?? detail.trackingNumber ?? null,
    carrier: detail.trackingProvider ?? null,
    orderStatus: detail.orderStatus ?? null,
  };
}
