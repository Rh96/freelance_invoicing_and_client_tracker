import { describe, expect, it } from "vitest";
import type { Invoice } from "@/domain/invoice";
import type { InvoiceStatus } from "@/domain/invoice-status";
import { countByStatus, filterInvoices } from "./filter-invoices";

const TODAY = "2026-11-15";

function invoice(
  number: string,
  status: InvoiceStatus,
  dueDate: string,
): Invoice {
  return {
    id: number,
    number,
    clientId: "c1",
    status,
    issueDate: "2026-10-01",
    dueDate,
    taxRateBps: 0,
    lineItems: [],
    notes: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    sentAt: status === "draft" ? null : "2026-10-01T00:00:00.000Z",
    paidAt: status === "paid" ? "2026-10-02T00:00:00.000Z" : null,
  };
}

const draft = invoice("INV-0005", "draft", "2026-10-01"); // past due but draft: not overdue
const sent = invoice("INV-0004", "sent", "2026-11-15"); // due today: not overdue
const overdue = invoice("INV-0003", "sent", "2026-11-14");
const paidLate = invoice("INV-0002", "paid", "2026-10-01"); // past due but paid: not overdue
const paid = invoice("INV-0001", "paid", "2026-12-01");
const all = [draft, sent, overdue, paidLate, paid];

describe("filterInvoices", () => {
  it("returns everything for 'all', in the same order", () => {
    expect(filterInvoices(all, "all", TODAY)).toEqual(all);
  });

  it.each([
    ["draft", [draft]],
    ["sent", [sent]], // excludes the overdue one
    ["overdue", [overdue]],
    ["paid", [paidLate, paid]],
  ] as const)("filters %s by displayed status", (status, expected) => {
    expect(filterInvoices(all, status, TODAY)).toEqual(expected);
  });
});

describe("countByStatus", () => {
  it("counts each invoice once, so the parts add up to all", () => {
    const counts = countByStatus(all, TODAY);
    expect(counts).toEqual({ all: 5, draft: 1, sent: 1, overdue: 1, paid: 2 });
    expect(counts.draft + counts.sent + counts.overdue + counts.paid).toBe(
      counts.all,
    );
  });

  it("returns zeros for no invoices", () => {
    expect(countByStatus([], TODAY)).toEqual({
      all: 0,
      draft: 0,
      sent: 0,
      overdue: 0,
      paid: 0,
    });
  });
});
