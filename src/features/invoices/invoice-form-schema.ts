import { z } from "zod";
import {
  invoiceDatesSchema,
  type Invoice,
  type InvoiceInput,
} from "@/domain/invoice";
import {
  basisPointsToPercent,
  centsToDollars,
  dollarsToCents,
  hasAtMostTwoDecimals,
  invoiceTotals,
  lineTotalCents,
  percentToBasisPoints,
  type InvoiceTotals,
} from "@/domain/money";

/**
 * What the invoice form edits: dollars and percent, as people type them.
 * `toInvoiceInput` converts to the domain's cents and basis points (ADR-003),
 * and the repository validates again with the domain schema.
 *
 * Empty number inputs arrive as NaN (`valueAsNumber`), which z.number() rejects
 * with the "Enter a …" message.
 */
export const lineItemFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, { error: "Description is required" })
    .max(200, { error: "Description must be 200 characters or fewer" }),
  quantity: z
    .number({ error: "Enter a quantity" })
    .positive({ error: "Quantity must be greater than 0" })
    .refine(hasAtMostTwoDecimals, {
      error: "Quantity can have at most 2 decimals",
    }),
  unitPrice: z
    .number({ error: "Enter a price" })
    .nonnegative({ error: "Price can't be negative" })
    .refine(hasAtMostTwoDecimals, {
      error: "Price can have at most 2 decimals",
    }),
});

export const invoiceFormSchema = z
  .object({
    clientId: z.string().min(1, { error: "Choose a client" }),
    issueDate: z.iso.date({ error: "Enter an issue date" }),
    dueDate: z.iso.date({ error: "Enter a due date" }),
    taxRatePercent: z
      .number({ error: "Enter a tax rate" })
      .min(0, { error: "Tax rate can't be negative" })
      .max(100, { error: "Tax rate can't exceed 100%" })
      .refine(hasAtMostTwoDecimals, {
        error: "Tax rate can have at most 2 decimals",
      }),
    lineItems: z.array(lineItemFormSchema),
    notes: z
      .string()
      .trim()
      .max(1000, { error: "Notes must be 1000 characters or fewer" }),
  })
  .refine((form) => form.dueDate >= form.issueDate, {
    error: "Due date must be on or after the issue date",
    path: ["dueDate"],
    // Run even when other fields fail, so this error isn't hidden behind an empty price.
    when: (payload) => invoiceDatesSchema.safeParse(payload.value).success,
  });

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;
export type InvoiceFormData = z.output<typeof invoiceFormSchema>;
export type LineItemFormValues = InvoiceFormValues["lineItems"][number];

/** A fresh line. NaN is what an empty number input holds; it renders as an empty field. */
export function emptyLineItem(): LineItemFormValues {
  return { description: "", quantity: 1, unitPrice: Number.NaN };
}

export function toInvoiceInput(data: InvoiceFormData): InvoiceInput {
  return {
    clientId: data.clientId,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    taxRateBps: percentToBasisPoints(data.taxRatePercent),
    notes: data.notes,
    lineItems: data.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: dollarsToCents(item.unitPrice),
    })),
  };
}

/** The reverse of `toInvoiceInput`, for editing a saved invoice. */
export function toFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    clientId: invoice.clientId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    taxRatePercent: basisPointsToPercent(invoice.taxRateBps),
    notes: invoice.notes,
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: centsToDollars(item.unitPriceCents),
    })),
  };
}

/** Maps a domain field path from a `RepositoryError` to the matching form field. */
export function toFormField(path: string): string {
  if (path === "taxRateBps") return "taxRatePercent";
  return path.replace(/^(lineItems\.\d+\.)unitPriceCents$/, "$1unitPrice");
}

function validAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && hasAtMostTwoDecimals(value);
}

/** Line total for display while typing; incomplete or invalid input counts as $0. */
export function previewLineTotal(item: Partial<LineItemFormValues>): number {
  const { quantity = Number.NaN, unitPrice = Number.NaN } = item;
  if (!validAmount(quantity) || !validAmount(unitPrice)) return 0;
  return lineTotalCents({
    quantity,
    unitPriceCents: dollarsToCents(unitPrice),
  });
}

/** Subtotal, tax and total for display while typing; never throws on half-typed input. */
export function previewTotals(
  lineItems: readonly Partial<LineItemFormValues>[],
  taxRatePercent: number,
): InvoiceTotals {
  const taxRateBps =
    validAmount(taxRatePercent) && taxRatePercent <= 100
      ? percentToBasisPoints(taxRatePercent)
      : 0;
  // Each line is already a whole-cent total, so it's passed on as quantity 1.
  const lines = lineItems.map((item) => ({
    quantity: 1,
    unitPriceCents: previewLineTotal(item),
  }));
  return invoiceTotals(lines, taxRateBps);
}
