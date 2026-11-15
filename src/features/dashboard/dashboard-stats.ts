import { daysBetween } from "@/domain/dates";
import type { Invoice } from "@/domain/invoice";
import { isOverdue, type IsoDate } from "@/domain/invoice-status";
import { invoiceTotals, type Cents } from "@/domain/money";

export type MoneySummary = {
  /** Sent and not yet paid, overdue included. Drafts aren't owed yet. */
  outstandingCents: Cents;
  outstandingCount: number;
  paidCents: Cents;
  paidCount: number;
};

const totalOf = (invoice: Invoice): Cents =>
  invoiceTotals(invoice.lineItems, invoice.taxRateBps).totalCents;

/** All-time totals (PRD: no period filter in v1). */
export function moneySummary(invoices: readonly Invoice[]): MoneySummary {
  const summary: MoneySummary = {
    outstandingCents: 0,
    outstandingCount: 0,
    paidCents: 0,
    paidCount: 0,
  };
  for (const invoice of invoices) {
    if (invoice.status === "sent") {
      summary.outstandingCents += totalOf(invoice);
      summary.outstandingCount += 1;
    } else if (invoice.status === "paid") {
      summary.paidCents += totalOf(invoice);
      summary.paidCount += 1;
    }
  }
  return summary;
}

export type OverdueInvoice = {
  invoice: Invoice;
  totalCents: Cents;
  daysOverdue: number;
};

/** Overdue invoices, most overdue first; ties go to the larger amount. */
export function overdueInvoices(
  invoices: readonly Invoice[],
  today: IsoDate,
): OverdueInvoice[] {
  return invoices
    .filter((invoice) => isOverdue(invoice, today))
    .map((invoice) => ({
      invoice,
      totalCents: totalOf(invoice),
      daysOverdue: daysBetween(invoice.dueDate, today),
    }))
    .sort(
      (a, b) => b.daysOverdue - a.daysOverdue || b.totalCents - a.totalCents,
    );
}
