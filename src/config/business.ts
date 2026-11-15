/**
 * Business-wide settings. v1 has no settings screen, so these live in code.
 * Business name and address are added with the print view (T14).
 */
export const moneyFormat = {
  currency: "USD",
  locale: "en-US",
} as const;

export type MoneyFormat = { currency: string; locale: string };

/** Invoice numbers look like `INV-0001`. */
export const invoiceNumbering = {
  prefix: "INV",
  digits: 4,
} as const;

/** Defaults for new invoices; the user can change both per invoice. */
export const invoiceDefaults = {
  /** Due date = issue date + this many days (Net 30). */
  paymentTermsDays: 30,
  /** 8.25%, in basis points. */
  taxRateBps: 825,
} as const;
