"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import type { Client } from "@/domain/client";
import type { Invoice } from "@/domain/invoice";
import { formatDate } from "@/domain/dates";
import { displayStatus, toIsoDate } from "@/domain/invoice-status";
import { formatMoney, invoiceTotals } from "@/domain/money";
import { useClients } from "@/features/clients/queries";
import { useInvoiceFilters } from "@/stores/invoice-filters";
import { cn } from "@/lib/utils";
import {
  countByStatus,
  filterInvoices,
  STATUS_FILTER_LABELS,
  STATUS_FILTERS,
} from "./filter-invoices";
import { useInvoices } from "./queries";

export function InvoiceList() {
  const invoicesQuery = useInvoices();
  const clientsQuery = useClients();

  if (invoicesQuery.status === "pending" || clientsQuery.status === "pending") {
    return (
      <div aria-busy="true" className="space-y-2">
        <p role="status" className="sr-only">
          Loading invoices…
        </p>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-10 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  if (invoicesQuery.status === "error" || clientsQuery.status === "error") {
    const error = invoicesQuery.error ?? clientsQuery.error;
    const corrupt = isRepositoryError(error) && error.code === "corrupt_data";
    const retrying = invoicesQuery.isFetching || clientsQuery.isFetching;
    return (
      <div role="alert" className="space-y-3 rounded-md border p-4">
        {corrupt ? (
          <p>
            Your saved data couldn&apos;t be read. Use &ldquo;Reset demo
            data&rdquo; at the bottom of the page to restore it.
          </p>
        ) : (
          <>
            <p>Couldn&apos;t load invoices.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={retrying}
              onClick={() => {
                if (invoicesQuery.isError) void invoicesQuery.refetch();
                if (clientsQuery.isError) void clientsQuery.refetch();
              }}
            >
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          </>
        )}
      </div>
    );
  }

  if (invoicesQuery.data.length === 0) {
    return <p className="text-muted-foreground">No invoices yet.</p>;
  }

  return (
    <InvoiceTable invoices={invoicesQuery.data} clients={clientsQuery.data} />
  );
}

/**
 * Rendered only once data has loaded, so "today" is read in the browser on each visit.
 * Reading the clock in the parent would run during prerender (cacheComponents rejects that,
 * and the date would be frozen at build time).
 */
function InvoiceTable({
  invoices,
  clients,
}: {
  invoices: readonly Invoice[];
  clients: readonly Client[];
}) {
  const status = useInvoiceFilters((state) => state.status);
  const setStatus = useInvoiceFilters((state) => state.setStatus);
  const allRadio = useRef<HTMLInputElement>(null);
  const today = toIsoDate(new Date());

  const counts = useMemo(
    () => countByStatus(invoices, today),
    [invoices, today],
  );
  const visible = useMemo(
    () => filterInvoices(invoices, status, today),
    [invoices, status, today],
  );
  const clientsById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Filter by status</legend>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <div key={filter}>
              <input
                ref={filter === "all" ? allRadio : undefined}
                type="radio"
                id={`invoice-status-${filter}`}
                name="invoice-status"
                value={filter}
                checked={status === filter}
                onChange={() => setStatus(filter)}
                className="peer sr-only"
              />
              <label
                htmlFor={`invoice-status-${filter}`}
                className={cn(
                  "inline-flex cursor-pointer rounded-full border px-3 py-1 text-sm",
                  "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                )}
              >
                {STATUS_FILTER_LABELS[filter]} ({counts[filter]})
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <p role="status" className="text-sm text-muted-foreground">
        {status === "all"
          ? `${counts.all} ${counts.all === 1 ? "invoice" : "invoices"}`
          : `Showing ${visible.length} of ${counts.all} invoices`}
      </p>

      {visible.length === 0 ? (
        <div className="space-y-3">
          <p>No {STATUS_FILTER_LABELS[status].toLowerCase()} invoices.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatus("all");
              allRadio.current?.focus();
            }}
          >
            Show all
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead className="border-b bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Number
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Client
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Issued
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Due
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((invoice) => {
                const client = clientsById.get(invoice.clientId);
                return (
                  <tr key={invoice.id} className="border-b last:border-0">
                    {/* TBD (T12): link to the invoice page */}
                    <td className="px-3 py-2 font-medium">{invoice.number}</td>
                    <td className="px-3 py-2">
                      {client ? (
                        <Link
                          href={`/clients/${client.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {client.name}
                        </Link>
                      ) : (
                        "Unknown client"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-3 py-2">{formatDate(invoice.dueDate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(
                        invoiceTotals(invoice.lineItems, invoice.taxRateBps)
                          .totalCents,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={displayStatus(invoice, today)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
