import { business } from "@/config/business";
import type { Client } from "@/domain/client";
import { formatDate } from "@/domain/dates";
import type { Invoice } from "@/domain/invoice";
import {
  basisPointsToPercent,
  formatMoney,
  invoiceTotals,
  lineTotalCents,
} from "@/domain/money";

/**
 * The invoice as the client receives it (printed or saved as PDF). Presentational only:
 * compact spacing so a typical invoice (≤ 15 lines) fits on one page.
 */
export function InvoiceDocument({
  invoice,
  client,
}: {
  invoice: Invoice;
  client: Client;
}) {
  const totals = invoiceTotals(invoice.lineItems, invoice.taxRateBps);
  const stamp =
    invoice.status === "draft"
      ? "Draft"
      : invoice.status === "paid"
        ? "Paid"
        : null;

  return (
    <article
      aria-labelledby="invoice-document-title"
      className="mx-auto max-w-3xl space-y-6 rounded-md border bg-background p-8 text-sm print:max-w-none print:space-y-4 print:rounded-none print:border-0 print:p-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-lg font-semibold">{business.name}</p>
          <p className="whitespace-pre-line text-muted-foreground">
            {business.address}
          </p>
          <p className="text-muted-foreground">{business.email}</p>
        </div>
        <div className="text-right">
          <h1
            id="invoice-document-title"
            className="text-2xl font-semibold tracking-tight"
          >
            Invoice {invoice.number}
          </h1>
          {stamp && (
            <p className="mt-1 inline-block rounded border-2 border-current px-2 text-xs font-bold uppercase tracking-widest">
              {stamp}
            </p>
          )}
          <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-4">
            <dt className="text-muted-foreground">Issued</dt>
            <dd>{formatDate(invoice.issueDate)}</dd>
            <dt className="text-muted-foreground">Due</dt>
            <dd>{formatDate(invoice.dueDate)}</dd>
          </dl>
        </div>
      </header>

      <section aria-labelledby="bill-to-title">
        <h2
          id="bill-to-title"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Bill to
        </h2>
        <p className="font-medium">{client.name}</p>
        {client.company && <p>{client.company}</p>}
        {client.address && (
          <p className="whitespace-pre-line">{client.address}</p>
        )}
        <p>{client.email}</p>
      </section>

      <table className="w-full text-left">
        <caption className="sr-only">Line items</caption>
        <thead className="border-b">
          <tr>
            <th scope="col" className="py-1.5 print:py-1 font-medium">
              Description
            </th>
            <th
              scope="col"
              className="py-1.5 print:py-1 text-right font-medium"
            >
              Qty
            </th>
            <th
              scope="col"
              className="py-1.5 print:py-1 text-right font-medium"
            >
              Unit price
            </th>
            <th
              scope="col"
              className="py-1.5 print:py-1 text-right font-medium"
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-muted-foreground">
                No line items.
              </td>
            </tr>
          ) : (
            invoice.lineItems.map((item) => (
              <tr key={item.id} className="border-b break-inside-avoid">
                <td className="py-1.5 print:py-1 pr-4">{item.description}</td>
                <td className="py-1.5 print:py-1 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-1.5 print:py-1 text-right tabular-nums">
                  {formatMoney(item.unitPriceCents)}
                </td>
                <td className="py-1.5 print:py-1 text-right tabular-nums">
                  {formatMoney(lineTotalCents(item))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 break-inside-avoid">
        <dt>Subtotal</dt>
        <dd className="text-right tabular-nums">
          {formatMoney(totals.subtotalCents)}
        </dd>
        <dt>Tax ({basisPointsToPercent(invoice.taxRateBps)}%)</dt>
        <dd className="text-right tabular-nums">
          {formatMoney(totals.taxCents)}
        </dd>
        <div aria-hidden="true" className="col-span-2 border-t" />
        <dt className="font-semibold">Total due</dt>
        <dd className="text-right font-semibold tabular-nums">
          {formatMoney(totals.totalCents)}
        </dd>
      </dl>

      <footer className="space-y-2 break-inside-avoid">
        <p>
          Please pay by <strong>{formatDate(invoice.dueDate)}</strong>.
        </p>
        {invoice.notes && (
          <p className="whitespace-pre-line">{invoice.notes}</p>
        )}
      </footer>
    </article>
  );
}
