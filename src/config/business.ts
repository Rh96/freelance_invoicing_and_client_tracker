/**
 * Business-wide settings. v1 has no settings screen, so these live in code.
 * Includes the business details printed on invoices (T14).
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

/**
 * Shown at the top of printed invoices. A fictional demo business; the `.example`
 * domain is reserved, so the email can never reach a real inbox.
 */
export const business = {
  name: "Harbor & Pine Studio",
  address: "120 Main St, Suite 4\nSpringfield, IL 62701",
  email: "hello@harborpine.example",
} as const;
