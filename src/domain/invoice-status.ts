/**
 * Invoice status rules (ADR-005, ADR-008):
 * - Stored statuses are draft, sent and paid.
 * - "Overdue" is derived: sent and the due date is before today. It is never stored.
 * - Allowed transitions: draft → sent, sent → paid, paid → sent (undo a mistaken payment).
 */
export const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type DisplayStatus = InvoiceStatus | "overdue";

/** Calendar date as `YYYY-MM-DD`. ISO dates compare correctly as strings. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const TRANSITIONS: Readonly<Record<InvoiceStatus, readonly InvoiceStatus[]>> = {
  draft: ["sent"],
  sent: ["paid"],
  paid: ["sent"],
};

export function allowedTransitions(
  from: InvoiceStatus,
): readonly InvoiceStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function assertIsoDate(value: string, name: string): void {
  if (!ISO_DATE.test(value)) {
    throw new RangeError(`${name} must be YYYY-MM-DD, got "${value}"`);
  }
}

type StatusInput = { status: InvoiceStatus; dueDate: IsoDate };

/** `today` is passed in (not read from the clock) so callers and tests control it. */
export function isOverdue(
  { status, dueDate }: StatusInput,
  today: IsoDate,
): boolean {
  assertIsoDate(dueDate, "dueDate");
  assertIsoDate(today, "today");
  return status === "sent" && dueDate < today;
}

export function displayStatus(
  invoice: StatusInput,
  today: IsoDate,
): DisplayStatus {
  return isOverdue(invoice, today) ? "overdue" : invoice.status;
}

/** The local calendar date of `date` (not UTC), e.g. for computing `today`. */
export function toIsoDate(date: Date): IsoDate {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
