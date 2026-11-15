import type { Invoice } from "@/domain/invoice";
import {
  displayStatus,
  type DisplayStatus,
  type IsoDate,
} from "@/domain/invoice-status";

export type StatusFilter = "all" | DisplayStatus;

/** In display order. Every invoice matches exactly one status, so the counts add up to "all". */
export const STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "draft",
  "sent",
  "overdue",
  "paid",
];

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  draft: "Draft",
  sent: "Sent",
  overdue: "Overdue",
  paid: "Paid",
};

/** Keeps the input order. "sent" excludes overdue invoices; they have their own filter. */
export function filterInvoices(
  invoices: readonly Invoice[],
  status: StatusFilter,
  today: IsoDate,
): Invoice[] {
  if (status === "all") return [...invoices];
  return invoices.filter((invoice) => displayStatus(invoice, today) === status);
}

export function countByStatus(
  invoices: readonly Invoice[],
  today: IsoDate,
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: invoices.length,
    draft: 0,
    sent: 0,
    overdue: 0,
    paid: 0,
  };
  for (const invoice of invoices) counts[displayStatus(invoice, today)] += 1;
  return counts;
}
