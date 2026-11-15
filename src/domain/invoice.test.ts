import { describe, expect, it } from "vitest";
import { invoiceInputSchema } from "./invoice";

describe("invoiceInputSchema", () => {
  it("reports a due date before the issue date even when another field fails outright", () => {
    const result = invoiceInputSchema.safeParse({
      clientId: "c1",
      issueDate: "2026-11-15",
      dueDate: "2026-11-01",
      taxRateBps: 0,
      lineItems: [
        { description: "Work", quantity: Number.NaN, unitPriceCents: 100 },
      ],
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["lineItems.0.quantity", "dueDate"]),
    );
  });

  it("skips the date comparison while a date itself is invalid", () => {
    const result = invoiceInputSchema.safeParse({
      clientId: "c1",
      issueDate: "not-a-date",
      dueDate: "2026-11-01",
      taxRateBps: 0,
      lineItems: [],
    });
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).not.toContain(
      "Due date must be on or after the issue date",
    );
  });
});
