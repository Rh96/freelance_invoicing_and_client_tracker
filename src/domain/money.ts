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

/**
 * Converts a quantity with up to 2 decimals to an integer count of hundredths,
 * so the rest of the math stays in integers (1.15 * 100 is 114.99999999999999 in floats).
 */
function quantityToHundredths(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError(
      `quantity must be a non-negative number, got ${quantity}`,
    );
  }
  const hundredths = Math.round(quantity * 100);
  // Tolerance absorbs float noise; anything larger means a 3rd decimal was entered.
  if (Math.abs(quantity * 100 - hundredths) > 1e-6) {
    throw new RangeError(
      `quantity supports at most 2 decimals, got ${quantity}`,
    );
  }
  return hundredths;
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
