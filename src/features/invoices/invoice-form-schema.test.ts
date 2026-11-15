import { describe, expect, it } from "vitest";
import {
  invoiceFormSchema,
  previewLineTotal,
  previewTotals,
  toFormField,
  toInvoiceInput,
  type InvoiceFormValues,
} from "./invoice-form-schema";

const valid: InvoiceFormValues = {
  clientId: "c1",
  issueDate: "2026-11-15",
  dueDate: "2026-12-15",
  taxRatePercent: 8.25,
  lineItems: [{ description: "Design", quantity: 2, unitPrice: 0.29 }],
  notes: " Thanks! ",
};

function errorsOf(values: InvoiceFormValues) {
  const result = invoiceFormSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join("."), i.message]),
      );
}

describe("invoiceFormSchema", () => {
  it("accepts a valid form and trims text", () => {
    const result = invoiceFormSchema.parse(valid);
    expect(result.notes).toBe("Thanks!");
  });

  it("reports each problem on its field", () => {
    expect(
      errorsOf({
        ...valid,
        clientId: "",
        dueDate: "2026-11-01",
        taxRatePercent: 120,
        lineItems: [{ description: " ", quantity: 0, unitPrice: Number.NaN }],
      }),
    ).toEqual({
      clientId: "Choose a client",
      dueDate: "Due date must be on or after the issue date",
      taxRatePercent: "Tax rate can't exceed 100%",
      "lineItems.0.description": "Description is required",
      "lineItems.0.quantity": "Quantity must be greater than 0",
      "lineItems.0.unitPrice": "Enter a price",
    });
  });

  it("rejects sub-cent prices and accepts an empty draft", () => {
    expect(
      errorsOf({
        ...valid,
        lineItems: [{ description: "x", quantity: 1, unitPrice: 1.005 }],
      }),
    ).toEqual({ "lineItems.0.unitPrice": "Price can have at most 2 decimals" });
    expect(errorsOf({ ...valid, lineItems: [] })).toEqual({});
  });
});

describe("toInvoiceInput", () => {
  it("converts dollars to cents and percent to basis points", () => {
    expect(toInvoiceInput(invoiceFormSchema.parse(valid))).toEqual({
      clientId: "c1",
      issueDate: "2026-11-15",
      dueDate: "2026-12-15",
      taxRateBps: 825,
      notes: "Thanks!",
      lineItems: [{ description: "Design", quantity: 2, unitPriceCents: 29 }],
    });
  });
});

describe("toFormField", () => {
  it.each([
    ["taxRateBps", "taxRatePercent"],
    ["lineItems.3.unitPriceCents", "lineItems.3.unitPrice"],
    ["lineItems.0.description", "lineItems.0.description"],
    ["clientId", "clientId"],
  ])("%s → %s", (path, field) => {
    expect(toFormField(path)).toBe(field);
  });
});

describe("previewTotals", () => {
  it("matches the domain math, including tax rounded once", () => {
    // 2 × $10.00 = $20.00; 8.25% = $1.65; total $21.65
    expect(previewTotals([{ quantity: 2, unitPrice: 10 }], 8.25)).toEqual({
      subtotalCents: 2000,
      taxCents: 165,
      totalCents: 2165,
    });
  });

  it("treats half-typed or invalid values as $0 instead of throwing", () => {
    expect(previewLineTotal({ quantity: 2, unitPrice: Number.NaN })).toBe(0);
    expect(previewLineTotal({ quantity: 1.005, unitPrice: 5 })).toBe(0);
    expect(
      previewTotals(
        [
          { quantity: 1, unitPrice: 10 },
          { quantity: Number.NaN, unitPrice: 5 },
          {},
        ],
        Number.NaN,
      ),
    ).toEqual({ subtotalCents: 1000, taxCents: 0, totalCents: 1000 });
  });
});
