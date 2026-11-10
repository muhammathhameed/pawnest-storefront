import { assertCents, minorUnitExponent, type Cents } from "./money";

export interface MarkupRule {
  id: string;
  name: string;
  /** Bracket is [minCostCents, maxCostCents); null max means unbounded. */
  minCostCents: number;
  maxCostCents: number | null;
  multiplier: number;
  flatCents: number;
  /** Force the price to end in these cents (e.g. 99). null = no rounding. */
  roundToCents: number | null;
  /** Lower wins when brackets overlap. */
  priority: number;
  isActive: boolean;
}

export interface PriceResult {
  priceCents: Cents;
  ruleId: string;
  ruleName: string;
}

export class NoMarkupRuleError extends Error {
  constructor(costCents: number) {
    super(`No active markup rule covers a cost of ${costCents} minor units`);
    this.name = "NoMarkupRuleError";
  }
}

export function selectMarkupRule(
  costCents: Cents,
  rules: readonly MarkupRule[],
): MarkupRule | null {
  assertCents(costCents, "costCents");
  const matches = rules.filter(
    (rule) =>
      rule.isActive &&
      costCents >= rule.minCostCents &&
      (rule.maxCostCents === null || costCents < rule.maxCostCents),
  );
  if (matches.length === 0) return null;
  // Most specific bracket wins ties: lowest priority number, then highest floor.
  matches.sort(
    (a, b) => a.priority - b.priority || b.minCostCents - a.minCostCents,
  );
  return matches[0];
}

/** Smallest price >= cents whose last two digits equal `ending`. */
export function roundUpToEnding(cents: Cents, ending: number): Cents {
  if (!Number.isInteger(ending) || ending < 0 || ending > 99) {
    throw new RangeError("ending must be an integer from 0 to 99");
  }
  const candidate = Math.floor(cents / 100) * 100 + ending;
  return candidate >= cents ? candidate : candidate + 100;
}

export interface PriceOptions {
  /** Never price below this (e.g. a floor set by the operator). */
  minPriceCents?: Cents;
  /** Currency of the price, used only to skip x.99 rounding for 0-decimal currencies. */
  currency?: string;
}

/**
 * Sell price = cost * multiplier + flat, optionally nudged up to a price
 * ending. The cost must already be in the sell currency.
 */
export function computeSellPrice(
  costCents: Cents,
  rules: readonly MarkupRule[],
  options: PriceOptions = {},
): PriceResult {
  const rule = selectMarkupRule(costCents, rules);
  if (!rule) throw new NoMarkupRuleError(costCents);

  let price = Math.round(costCents * rule.multiplier) + rule.flatCents;
  const decimals = minorUnitExponent(options.currency ?? "USD");
  if (rule.roundToCents !== null && decimals === 2) {
    price = roundUpToEnding(price, rule.roundToCents);
  }
  if (options.minPriceCents !== undefined) {
    price = Math.max(price, options.minPriceCents);
  }
  return { priceCents: price, ruleId: rule.id, ruleName: rule.name };
}

// ---------------------------------------------------------------------------
// Currency conversion
// ---------------------------------------------------------------------------

export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  fetchedAt: Date;
}

export class MissingFxRateError extends Error {
  constructor(from: string, to: string) {
    super(`No FX rate available to convert ${from} to ${to}`);
    this.name = "MissingFxRateError";
  }
}

export class StaleFxRateError extends Error {
  constructor(from: string, to: string, ageHours: number) {
    super(`FX rate ${from}->${to} is ${Math.round(ageHours)}h old`);
    this.name = "StaleFxRateError";
  }
}

export interface ConvertOptions {
  now?: Date;
  /** Reject rates older than this many hours. Default 48. */
  maxAgeHours?: number;
}

/** Resolves a rate directly, via its inverse, or pivoting through USD. */
function resolveRate(
  from: string,
  to: string,
  rates: readonly FxRate[],
): { rate: number; fetchedAt: Date } | null {
  const direct = rates.find((r) => r.base === from && r.quote === to);
  if (direct) return { rate: direct.rate, fetchedAt: direct.fetchedAt };

  const inverse = rates.find((r) => r.base === to && r.quote === from);
  if (inverse) return { rate: 1 / inverse.rate, fetchedAt: inverse.fetchedAt };

  const pivot = "USD";
  if (from !== pivot && to !== pivot) {
    const first = resolveRate(from, pivot, rates);
    const second = resolveRate(pivot, to, rates);
    if (first && second) {
      return {
        rate: first.rate * second.rate,
        fetchedAt:
          first.fetchedAt < second.fetchedAt ? first.fetchedAt : second.fetchedAt,
      };
    }
  }
  return null;
}

export function convertCents(
  cents: Cents,
  from: string,
  to: string,
  rates: readonly FxRate[],
  options: ConvertOptions = {},
): Cents {
  assertCents(cents, "cents");
  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (source === target) return cents;

  const resolved = resolveRate(source, target, rates);
  if (!resolved) throw new MissingFxRateError(source, target);

  const now = options.now ?? new Date();
  const maxAge = options.maxAgeHours ?? 48;
  const ageHours = (now.getTime() - resolved.fetchedAt.getTime()) / 3_600_000;
  if (ageHours > maxAge) throw new StaleFxRateError(source, target, ageHours);

  const major = cents / 10 ** minorUnitExponent(source);
  return Math.round(major * resolved.rate * 10 ** minorUnitExponent(target));
}
