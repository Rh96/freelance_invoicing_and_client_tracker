/**
 * Business-wide settings. v1 has no settings screen, so these live in code.
 * Business name, address and invoice prefix are added with the print view (T14).
 */
export const moneyFormat = {
  currency: "USD",
  locale: "en-US",
} as const;

export type MoneyFormat = { currency: string; locale: string };
