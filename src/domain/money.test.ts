import { describe, expect, it } from "vitest";
import { formatMoney, invoiceTotals, lineTotalCents } from "./money";

describe("lineTotalCents", () => {
  it("multiplies whole quantities", () => {
    expect(lineTotalCents({ quantity: 2, unitPriceCents: 1500 })).toBe(3000);
  });

  it("rounds half a cent up", () => {
    // 1.5 × $9.99 = $14.985
    expect(lineTotalCents({ quantity: 1.5, unitPriceCents: 999 })).toBe(1499);
    expect(lineTotalCents({ quantity: 0.5, unitPriceCents: 1 })).toBe(1);
  });

  it("rounds below half a cent down", () => {
    expect(lineTotalCents({ quantity: 0.01, unitPriceCents: 1 })).toBe(0);
  });

  it("avoids float drift on decimal quantities", () => {
    // Exact value is 14.5 → 15, but naive Math.round(0.29 * 50) sees 14.499999999999998 → 14.
    expect(lineTotalCents({ quantity: 0.29, unitPriceCents: 50 })).toBe(15);
    // Exact value is 61.5 → 62, naive float gives 61.49999999999999 → 61.
    expect(lineTotalCents({ quantity: 0.41, unitPriceCents: 150 })).toBe(62);
  });

  it("allows a zero quantity", () => {
    expect(lineTotalCents({ quantity: 0, unitPriceCents: 500 })).toBe(0);
  });

  it.each([
    ["negative quantity", { quantity: -1, unitPriceCents: 100 }],
    ["NaN quantity", { quantity: Number.NaN, unitPriceCents: 100 }],
    ["3-decimal quantity", { quantity: 1.005, unitPriceCents: 100 }],
    ["fractional cents", { quantity: 1, unitPriceCents: 10.5 }],
    ["negative price", { quantity: 1, unitPriceCents: -100 }],
  ])("rejects %s", (_label, input) => {
    expect(() => lineTotalCents(input)).toThrow(RangeError);
  });
});

describe("invoiceTotals", () => {
  it("returns zeros for an invoice with no lines", () => {
    expect(invoiceTotals([], 2000)).toEqual({
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });

  it("sums lines and applies 0% tax", () => {
    const lines = [
      { quantity: 2, unitPriceCents: 1500 },
      { quantity: 1.5, unitPriceCents: 999 },
    ];
    expect(invoiceTotals(lines, 0)).toEqual({
      subtotalCents: 4499,
      taxCents: 0,
      totalCents: 4499,
    });
  });

  it("rounds tax to the nearest cent", () => {
    // 20% of $9.99 = $1.998
    expect(invoiceTotals([{ quantity: 1, unitPriceCents: 999 }], 2000)).toEqual(
      {
        subtotalCents: 999,
        taxCents: 200,
        totalCents: 1199,
      },
    );
  });

  it("rounds tax once on the subtotal, not per line", () => {
    // Per line: 10% of $3.33 = 33.3 → 33, × 3 = 99. On the subtotal: 99.9 → 100.
    const lines = Array.from({ length: 3 }, () => ({
      quantity: 1,
      unitPriceCents: 333,
    }));
    expect(invoiceTotals(lines, 1000).taxCents).toBe(100);
  });

  it.each([-1, 10_001, 12.5])("rejects tax rate %s bps", (bps) => {
    expect(() => invoiceTotals([], bps)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("formats cents as USD with en-US conventions by default", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(5)).toBe("$0.05");
  });

  it("accepts another currency and locale", () => {
    expect(formatMoney(123456, { currency: "EUR", locale: "en-IE" })).toBe(
      "€1,234.56",
    );
  });

  it("rejects fractional cents", () => {
    expect(() => formatMoney(1.5)).toThrow(RangeError);
  });
});
