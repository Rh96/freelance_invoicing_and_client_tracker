"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import { useClients } from "@/features/clients/queries";
import { useFlash } from "@/stores/flash";
import { InvoiceForm } from "./invoice-form";
import { toFormValues } from "./invoice-form-schema";
import { useUpdateInvoice } from "./mutations";
import { useInvoice } from "./queries";

/** Only Drafts can be edited; Sent and Paid invoices redirect to their page (read-only lock). */
export function EditInvoice({ id }: { id: string }) {
  const router = useRouter();
  const invoiceQuery = useInvoice(id);
  const clientsQuery = useClients();
  const updateInvoice = useUpdateInvoice();
  const showFlash = useFlash((state) => state.show);

  const invoice = invoiceQuery.data;
  const locked = invoice !== undefined && invoice.status !== "draft";

  useEffect(() => {
    if (!invoice || !locked) return;
    showFlash(
      `${invoice.number} is ${invoice.status} and can no longer be edited.`,
    );
    router.replace(`/invoices/${invoice.id}`);
  }, [invoice, locked, router, showFlash]);

  // Active clients, plus the invoice's current client even if archived since (the repository allows keeping it).
  const clients = useMemo(
    () =>
      (clientsQuery.data ?? []).filter(
        (client) =>
          client.archivedAt === null || client.id === invoice?.clientId,
      ),
    [clientsQuery.data, invoice?.clientId],
  );

  if (invoiceQuery.status === "pending" || clientsQuery.status === "pending") {
    return (
      <div aria-busy="true" className="max-w-3xl space-y-4">
        <p role="status" className="sr-only">
          Loading invoice…
        </p>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-14 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  if (invoiceQuery.status === "error" || clientsQuery.status === "error") {
    const notFound =
      isRepositoryError(invoiceQuery.error) &&
      invoiceQuery.error.code === "not_found";
    const retrying = invoiceQuery.isFetching || clientsQuery.isFetching;
    return (
      <div role="alert" className="max-w-lg space-y-3 rounded-md border p-4">
        {notFound ? (
          <>
            <p>This invoice doesn&apos;t exist.</p>
            <Link
              href="/invoices"
              className="font-medium underline underline-offset-4"
            >
              Back to invoices
            </Link>
          </>
        ) : (
          <>
            <p>Couldn&apos;t load this invoice.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={retrying}
              onClick={() => {
                if (invoiceQuery.isError) void invoiceQuery.refetch();
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

  if (locked) {
    return <p role="status">Redirecting to {invoiceQuery.data.number}…</p>;
  }

  return (
    <InvoiceForm
      clients={clients}
      defaultValues={toFormValues(invoiceQuery.data)}
      submitLabel="Save changes"
      cancelHref={`/invoices/${id}`}
      onSubmit={async (input) => {
        const saved = await updateInvoice.mutateAsync({ id, input });
        showFlash(`${saved.number} saved.`);
        router.push(`/invoices/${id}`);
      }}
    />
  );
}
