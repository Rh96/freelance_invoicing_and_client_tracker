"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import type { Invoice } from "@/domain/invoice";
import { useClient } from "@/features/clients/queries";
import { InvoiceDocument } from "./invoice-document";
import { useInvoice } from "./queries";

export function PrintInvoice({ id }: { id: string }) {
  const { data: invoice, status, error, refetch, isFetching } = useInvoice(id);

  if (status === "pending") return <Loading />;
  if (status === "error") {
    const notFound = isRepositoryError(error) && error.code === "not_found";
    return notFound ? (
      <LoadError>
        <p>This invoice doesn&apos;t exist.</p>
        <Link
          href="/invoices"
          className="font-medium underline underline-offset-4"
        >
          Back to invoices
        </Link>
      </LoadError>
    ) : (
      <LoadError>
        <p>Couldn&apos;t load this invoice.</p>
        <RetryButton retrying={isFetching} onRetry={() => void refetch()} />
      </LoadError>
    );
  }
  return <PrintableInvoice invoice={invoice} />;
}

/** Loads the client once the invoice (and so its clientId) is known. */
function PrintableInvoice({ invoice }: { invoice: Invoice }) {
  const {
    data: client,
    status,
    refetch,
    isFetching,
  } = useClient(invoice.clientId);

  if (status === "pending") return <Loading />;
  if (status === "error") {
    return (
      <LoadError>
        <p>Couldn&apos;t load this invoice&apos;s client.</p>
        <RetryButton retrying={isFetching} onRetry={() => void refetch()} />
      </LoadError>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/invoices/${invoice.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to {invoice.number}
        </Link>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <InvoiceDocument invoice={invoice} client={client} />
    </div>
  );
}

function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <p role="status" className="sr-only">
        Loading invoice…
      </p>
      <div
        aria-hidden="true"
        className="mx-auto h-96 max-w-3xl animate-pulse rounded-md bg-muted"
      />
    </div>
  );
}

function LoadError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="max-w-lg space-y-3 rounded-md border p-4">
      {children}
    </div>
  );
}

function RetryButton({
  retrying,
  onRetry,
}: {
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Button variant="outline" size="sm" disabled={retrying} onClick={onRetry}>
      {retrying ? "Retrying…" : "Retry"}
    </Button>
  );
}
