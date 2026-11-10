/**
 * Money helpers. All amounts in the dropship layer are integer minor units
 * (cents for USD). Floats are only used transiently inside a calculation and
 * are always rounded back to an integer before leaving this module.
 */

export type Cents = number;

const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function minorUnitExponent(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

export function assertCents(value: unknown, label = "amount"): asserts value is Cents {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer of minor units`);
  }
}

/** Convert a decimal major-unit amount (e.g. dollars) to integer minor units. */
export function toMinorUnits(major: number, currency = "USD"): Cents {
  if (!Number.isFinite(major) || major < 0) {
    throw new RangeError("major amount must be a finite, non-negative number");
  }
  const factor = 10 ** minorUnitExponent(currency);
  // Nudge by epsilon so 1.005 style values round the way people expect.
  return Math.round((major + Number.EPSILON) * factor);
}

export function toMajorUnits(cents: Cents, currency = "USD"): number {
  return cents / 10 ** minorUnitExponent(currency);
}

export function multiplyCents(cents: Cents, multiplier: number): Cents {
  assertCents(cents);
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new RangeError("multiplier must be a finite, non-negative number");
  }
  return Math.round(cents * multiplier);
}
