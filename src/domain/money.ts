import { moneyFormat, type MoneyFormat } from "@/config/business";

/**
 * Money rules (ADR-003):
 * - Amounts are integer cents; tax rates are basis points (2000 = 20%).
 * - Line totals and tax are rounded half-up to the cent (all amounts are non-negative).
 * - Tax is calculated once on the subtotal, not per line.
 */
export type Cents = number;
export type BasisPoints = number;

export type LineItemAmount = {
  quantity: number;
  unitPriceCents: Cents;
};

export type InvoiceTotals = {
  subtotalCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
};

const MAX_TAX_RATE_BPS = 10_000;

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `${name} must be a non-negative integer, got ${value}`,
    );
  }
}

/** True when `value` has at most 2 decimals. Shared by the money math and the Zod schemas. */
export function hasAtMostTwoDecimals(value: number): boolean {
  // Tolerance absorbs float noise (1.15 * 100 is 114.99999999999999); anything larger is a 3rd decimal.
  return (
    Number.isFinite(value) &&
    Math.abs(value * 100 - Math.round(value * 100)) <= 1e-6
  );
}

/**
 * Converts a quantity with up to 2 decimals to an integer count of hundredths,
 * so the rest of the math stays in integers.
 */
function quantityToHundredths(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError(
      `quantity must be a non-negative number, got ${quantity}`,
    );
  }
  if (!hasAtMostTwoDecimals(quantity)) {
    throw new RangeError(
      `quantity supports at most 2 decimals, got ${quantity}`,
    );
  }
  return Math.round(quantity * 100);
}

export function lineTotalCents({
  quantity,
  unitPriceCents,
}: LineItemAmount): Cents {
  assertNonNegativeInteger(unitPriceCents, "unitPriceCents");
  const total = Math.round(
    (quantityToHundredths(quantity) * unitPriceCents) / 100,
  );
  assertNonNegativeInteger(total, "line total");
  return total;
}

export function invoiceTotals(
  lineItems: readonly LineItemAmount[],
  taxRateBps: BasisPoints,
): InvoiceTotals {
  assertNonNegativeInteger(taxRateBps, "taxRateBps");
  if (taxRateBps > MAX_TAX_RATE_BPS) {
    throw new RangeError(
      `taxRateBps must be at most ${MAX_TAX_RATE_BPS}, got ${taxRateBps}`,
    );
  }
  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + lineTotalCents(item),
    0,
  );
  const taxCents = Math.round((subtotalCents * taxRateBps) / MAX_TAX_RATE_BPS);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(
  cents: Cents,
  format: MoneyFormat = moneyFormat,
): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`cents must be an integer, got ${cents}`);
  }
  const key = `${format.locale}|${format.currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(format.locale, {
      style: "currency",
      currency: format.currency,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}

/**
 * Converts a dollar amount typed by a user (at most 2 decimals) to integer cents.
 * Rounding absorbs float noise: 0.29 * 100 is 28.999999999999996.
 */
export function dollarsToCents(dollars: number): Cents {
  if (
    !Number.isFinite(dollars) ||
    dollars < 0 ||
    !hasAtMostTwoDecimals(dollars)
  ) {
    throw new RangeError(
      `dollars must be non-negative with at most 2 decimals, got ${dollars}`,
    );
  }
  return Math.round(dollars * 100);
}

/** Converts a percentage typed by a user (e.g. 8.25) to basis points (825). */
export function percentToBasisPoints(percent: number): BasisPoints {
  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100 ||
    !hasAtMostTwoDecimals(percent)
  ) {
    throw new RangeError(
      `percent must be 0–100 with at most 2 decimals, got ${percent}`,
    );
  }
  return Math.round(percent * 100);
}

export function basisPointsToPercent(bps: BasisPoints): number {
  return bps / 100;
}

export function centsToDollars(cents: Cents): number {
  return cents / 100;
}
