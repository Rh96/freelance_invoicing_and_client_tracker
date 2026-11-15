import { z } from "zod";
import { INVOICE_STATUSES } from "./invoice-status";
import { hasAtMostTwoDecimals } from "./money";

const MAX_TAX_RATE_BPS = 10_000;

export const lineItemInputSchema = z.object({
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
  unitPriceCents: z
    .number({ error: "Enter a price" })
    .int({ error: "Price must be in whole cents" })
    .nonnegative({ error: "Price can't be negative" }),
});

/**
 * What a user can enter for an invoice. Number, status and timestamps are set by the repository.
 * Empty drafts (no line items) are allowed.
 */
export const invoiceInputSchema = z
  .object({
    clientId: z.string().min(1, { error: "Choose a client" }),
    issueDate: z.iso.date({ error: "Enter an issue date" }),
    dueDate: z.iso.date({ error: "Enter a due date" }),
    taxRateBps: z
      .number({ error: "Enter a tax rate" })
      .int({ error: "Tax rate is in whole basis points" })
      .min(0, { error: "Tax rate can't be negative" })
      .max(MAX_TAX_RATE_BPS, { error: "Tax rate can't exceed 100%" }),
    lineItems: z.array(lineItemInputSchema),
    notes: z
      .string()
      .trim()
      .max(1000, { error: "Notes must be 1000 characters or fewer" })
      .default(""),
  })
  .refine((invoice) => invoice.dueDate >= invoice.issueDate, {
    error: "Due date must be on or after the issue date",
    path: ["dueDate"],
  });

export type LineItemInput = z.input<typeof lineItemInputSchema>;
export type InvoiceInput = z.input<typeof invoiceInputSchema>;
export type InvoiceData = z.output<typeof invoiceInputSchema>;

export const lineItemSchema = lineItemInputSchema.extend({
  id: z.string().min(1),
});

/** A stored invoice. Totals and "overdue" are derived, never stored (ADR-005). */
export const invoiceSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum(INVOICE_STATUSES),
  issueDate: z.iso.date(),
  dueDate: z.iso.date(),
  taxRateBps: z.number().int().min(0).max(MAX_TAX_RATE_BPS),
  lineItems: z.array(lineItemSchema),
  notes: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  sentAt: z.iso.datetime().nullable(),
  paidAt: z.iso.datetime().nullable(),
});

export type LineItem = z.output<typeof lineItemSchema>;
export type Invoice = z.output<typeof invoiceSchema>;
