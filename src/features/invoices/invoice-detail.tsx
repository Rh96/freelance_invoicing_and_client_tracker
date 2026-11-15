"use client";

import Link from "next/link";
import { useRef } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import { formatDate } from "@/domain/dates";
import type { Invoice } from "@/domain/invoice";
import { displayStatus, toIsoDate } from "@/domain/invoice-status";
import {
  basisPointsToPercent,
  formatMoney,
  invoiceTotals,
  lineTotalCents,
} from "@/domain/money";
import { useClient } from "@/features/clients/queries";
import { InvoiceStatusActions } from "./invoice-status-actions";
import { useInvoice } from "./queries";

export function InvoiceDetail({ id }: { id: string }) {
  const { data: invoice, status, error, refetch, isFetching } = useInvoice(id);

  if (status === "pending") {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading invoice…
        </p>
        <div
          aria-hidden="true"
          className="h-8 w-48 animate-pulse rounded-md bg-muted"
        />
        <div
          aria-hidden="true"
          className="h-40 animate-pulse rounded-md bg-muted"
        />
      </div>
    );
  }

  if (status === "error") {
    const notFound = isRepositoryError(error) && error.code === "not_found";
    return (
      <div role="alert" className="max-w-lg space-y-3 rounded-md border p-4">
        {notFound ? (
          <>
            <h1 className="font-semibold">This invoice doesn&apos;t exist.</h1>
            <Link
              href="/invoices"
              className="font-medium underline underline-offset-4"
            >
              Back to invoices
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-semibold">Couldn&apos;t load this invoice.</h1>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </>
        )}
      </div>
    );
  }

  return <LoadedInvoice invoice={invoice} />;
}

/** Rendered after data loads, so "today" (for Overdue) is read in the browser. */
function LoadedInvoice({ invoice }: { invoice: Invoice }) {
  const { data: client } = useClient(invoice.clientId);
  const today = toIsoDate(new Date());
  const totals = invoiceTotals(invoice.lineItems, invoice.taxRateBps);
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* tabIndex -1: focus target after a status change replaces the clicked button. */}
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            {invoice.number}
          </h1>
          <StatusBadge status={displayStatus(invoice, today)} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {invoice.status === "draft" && (
            <Button variant="outline" asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/invoices/${invoice.id}/print`}>Print</Link>
          </Button>
          <InvoiceStatusActions invoice={invoice} headingRef={heading} />
        </div>
      </div>

      <dl className="grid max-w-2xl gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
        <dt className="text-sm text-muted-foreground">Client</dt>
        <dd>
          {client ? (
            <Link
              href={`/clients/${client.id}`}
              className="underline underline-offset-4"
            >
              {client.name}
            </Link>
          ) : (
            "…"
          )}
        </dd>
        <dt className="text-sm text-muted-foreground">Issued</dt>
        <dd>{formatDate(invoice.issueDate)}</dd>
        <dt className="text-sm text-muted-foreground">Due</dt>
        <dd>{formatDate(invoice.dueDate)}</dd>
      </dl>

      <section aria-labelledby="invoice-lines-title" className="space-y-3">
        <h2 id="invoice-lines-title" className="text-lg font-semibold">
          Line items
        </h2>
        {invoice.lineItems.length === 0 ? (
          <p className="text-muted-foreground">No line items yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Line items</caption>
              <thead className="border-b bg-muted/50">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Quantity
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Unit price
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(item.unitPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(lineTotalCents(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right tabular-nums">
            {formatMoney(totals.subtotalCents)}
          </dd>
          <dt>Tax ({basisPointsToPercent(invoice.taxRateBps)}%)</dt>
          <dd className="text-right tabular-nums">
            {formatMoney(totals.taxCents)}
          </dd>
          <dt className="font-semibold">Total</dt>
          <dd className="text-right font-semibold tabular-nums">
            {formatMoney(totals.totalCents)}
          </dd>
        </dl>
      </section>

      {invoice.notes && (
        <section aria-labelledby="invoice-notes-title" className="space-y-2">
          <h2 id="invoice-notes-title" className="text-lg font-semibold">
            Notes
          </h2>
          <p className="whitespace-pre-line">{invoice.notes}</p>
        </section>
      )}
    </div>
  );
}
