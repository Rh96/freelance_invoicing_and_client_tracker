import { describe, expect, it } from "vitest";
import type { Invoice } from "@/domain/invoice";
import type { InvoiceStatus } from "@/domain/invoice-status";
import { moneySummary, overdueInvoices } from "./dashboard-stats";

const TODAY = "2026-11-15";

function invoice(
  number: string,
  status: InvoiceStatus,
  dueDate: string,
  cents: number,
): Invoice {
  return {
    id: number,
    number,
    clientId: "c1",
    status,
    issueDate: "2026-10-01",
    dueDate,
    taxRateBps: 0,
    lineItems: [
      {
        id: `${number}-l`,
        description: "Work",
        quantity: 1,
        unitPriceCents: cents,
      },
    ],
    notes: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    sentAt: status === "draft" ? null : "2026-10-01T00:00:00.000Z",
    paidAt: status === "paid" ? "2026-10-05T00:00:00.000Z" : null,
  };
}

const draft = invoice("INV-0001", "draft", "2026-10-01", 99_900); // past due, but a draft
const dueToday = invoice("INV-0002", "sent", "2026-11-15", 10_000); // not overdue yet
const late5 = invoice("INV-0003", "sent", "2026-11-10", 20_000);
const late30 = invoice("INV-0004", "sent", "2026-10-16", 5_000);
const late5Bigger = invoice("INV-0005", "sent", "2026-11-10", 30_000);
const paidLate = invoice("INV-0006", "paid", "2026-10-01", 40_000); // paid: never overdue
const all = [draft, dueToday, late5, late30, late5Bigger, paidLate];

describe("moneySummary", () => {
  it("counts sent (incl. overdue) as outstanding, paid as paid, and ignores drafts", () => {
    expect(moneySummary(all)).toEqual({
      outstandingCents: 10_000 + 20_000 + 5_000 + 30_000,
      outstandingCount: 4,
      paidCents: 40_000,
      paidCount: 1,
    });
  });

  it("returns zeros for no invoices", () => {
    expect(moneySummary([])).toEqual({
      outstandingCents: 0,
      outstandingCount: 0,
      paidCents: 0,
      paidCount: 0,
    });
  });
});

describe("overdueInvoices", () => {
  it("lists only sent invoices past due, most overdue first, then by amount", () => {
    expect(
      overdueInvoices(all, TODAY).map((o) => [
        o.invoice.number,
        o.daysOverdue,
        o.totalCents,
      ]),
    ).toEqual([
      ["INV-0004", 30, 5_000],
      ["INV-0005", 5, 30_000],
      ["INV-0003", 5, 20_000],
    ]);
  });

  it("starts counting the day after the due date", () => {
    expect(overdueInvoices([dueToday], TODAY)).toEqual([]);
    expect(overdueInvoices([dueToday], "2026-11-16")[0]?.daysOverdue).toBe(1);
  });
});
