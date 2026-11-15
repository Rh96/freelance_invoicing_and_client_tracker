"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import type { Client } from "@/domain/client";
import { formatDate } from "@/domain/dates";
import { displayStatus, toIsoDate } from "@/domain/invoice-status";
import { formatMoney, invoiceTotals } from "@/domain/money";
import { useInvoices } from "@/features/invoices/queries";
import { useArchiveClient } from "./mutations";
import { useClient } from "./queries";

export function ClientDetail({ id }: { id: string }) {
  const { data: client, status, error, refetch, isFetching } = useClient(id);
  const archiveClient = useArchiveClient();

  if (status === "pending") {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading client…
        </p>
        <div
          aria-hidden="true"
          className="h-8 w-64 animate-pulse rounded-md bg-muted"
        />
        <div
          aria-hidden="true"
          className="h-24 animate-pulse rounded-md bg-muted"
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
            <p>This client doesn&apos;t exist.</p>
            <Link
              href="/clients"
              className="font-medium underline underline-offset-4"
            >
              Back to clients
            </Link>
          </>
        ) : (
          <>
            <p>Couldn&apos;t load this client.</p>
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

  const archived = client.archivedAt !== null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          {archived && client.archivedAt && (
            <p className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Archived on {formatDate(toIsoDate(new Date(client.archivedAt)))}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/clients/${client.id}/edit`}>Edit</Link>
          </Button>
          {!archived && (
            <Button asChild>
              <Link href={`/invoices/new?clientId=${client.id}`}>
                New invoice
              </Link>
            </Button>
          )}
          {!archived && (
            <ConfirmAction
              triggerLabel="Archive"
              title={`Archive ${client.name}?`}
              description="They'll be hidden from the client list and can't be picked for new invoices. Their invoices stay unchanged."
              confirmLabel="Archive client"
              pendingLabel="Archiving…"
              errorMessage="Couldn't archive the client. Please try again."
              successMessage={`${client.name} archived.`}
              destructive
              onConfirm={() => archiveClient.mutateAsync(client.id)}
            />
          )}
        </div>
      </div>

      <ClientDetails client={client} />
      <ClientInvoices clientId={client.id} />
    </div>
  );
}

function ClientDetails({ client }: { client: Client }) {
  return (
    <dl className="grid max-w-2xl gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
      <dt className="text-sm text-muted-foreground">Email</dt>
      <dd>
        <a
          href={`mailto:${client.email}`}
          className="underline underline-offset-4"
        >
          {client.email}
        </a>
      </dd>
      <dt className="text-sm text-muted-foreground">Company</dt>
      <dd>{client.company || "—"}</dd>
      <dt className="text-sm text-muted-foreground">Address</dt>
      <dd className="whitespace-pre-line">{client.address || "—"}</dd>
    </dl>
  );
}

function ClientInvoices({ clientId }: { clientId: string }) {
  const { data: invoices, status, refetch, isFetching } = useInvoices();
  const today = toIsoDate(new Date());
  const rows = useMemo(
    () => (invoices ?? []).filter((invoice) => invoice.clientId === clientId),
    [invoices, clientId],
  );

  return (
    <section aria-labelledby="client-invoices-title" className="space-y-3">
      <h2 id="client-invoices-title" className="text-lg font-semibold">
        Invoices
      </h2>
      {status === "pending" ? (
        <p className="text-muted-foreground">Loading invoices…</p>
      ) : status === "error" ? (
        <div role="alert" className="space-y-2">
          <p>Couldn&apos;t load invoices.</p>
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">
          No invoices for this client yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Invoices for this client</caption>
            <thead className="border-b bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Number
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
              {rows.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-0">
                  {/* TBD (T12): link to the invoice page */}
                  <td className="px-3 py-2 font-medium">{invoice.number}</td>
                  <td className="px-3 py-2">{formatDate(invoice.issueDate)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
