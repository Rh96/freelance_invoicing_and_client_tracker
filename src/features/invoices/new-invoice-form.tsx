"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { invoiceDefaults } from "@/config/business";
import type { Client } from "@/domain/client";
import { addDays } from "@/domain/dates";
import { toIsoDate } from "@/domain/invoice-status";
import { basisPointsToPercent } from "@/domain/money";
import { filterClients } from "@/features/clients/filter-clients";
import { useClients } from "@/features/clients/queries";
import { useFlash } from "@/stores/flash";
import { InvoiceForm } from "./invoice-form";
import { emptyLineItem, type InvoiceFormValues } from "./invoice-form-schema";
import { useCreateInvoice } from "./mutations";

/** `initialClientId` comes from `?clientId=` (e.g. "New invoice" on a client's page). */
export function NewInvoiceForm({
  initialClientId,
}: {
  initialClientId?: string;
}) {
  const { data: clients, status, refetch, isFetching } = useClients();
  const active = useMemo(() => filterClients(clients ?? [], ""), [clients]);
  // The form takes its defaults once, on mount. Right after "Add client", the cached list is
  // stale (it was invalidated while no screen showed it) and lacks the new client, so wait for
  // the refetch instead of rendering a form that can't preselect them.
  const waitingForClient =
    initialClientId !== undefined &&
    isFetching &&
    !active.some((client) => client.id === initialClientId);

  if (status === "pending" || waitingForClient) {
    return (
      <div aria-busy="true" className="max-w-3xl space-y-4">
        <p role="status" className="sr-only">
          Loading…
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

  if (status === "error") {
    return (
      <div role="alert" className="max-w-lg space-y-3 rounded-md border p-4">
        <p>Couldn&apos;t load clients.</p>
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="space-y-3">
        <p>Add a client before creating an invoice.</p>
        <Button asChild>
          <Link href="/clients/new">New client</Link>
        </Button>
      </div>
    );
  }

  return (
    <LoadedNewInvoiceForm clients={active} initialClientId={initialClientId} />
  );
}

/** Rendered after data loads, so "today" is read in the browser (see ARCHITECTURE conventions). */
function LoadedNewInvoiceForm({
  clients,
  initialClientId,
}: {
  clients: readonly Client[];
  initialClientId?: string;
}) {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const showFlash = useFlash((state) => state.show);
  const today = toIsoDate(new Date());

  const defaultValues: InvoiceFormValues = {
    // Ignore ids that aren't billable (unknown or archived).
    clientId: clients.some((c) => c.id === initialClientId)
      ? (initialClientId ?? "")
      : "",
    issueDate: today,
    dueDate: addDays(today, invoiceDefaults.paymentTermsDays),
    taxRatePercent: basisPointsToPercent(invoiceDefaults.taxRateBps),
    lineItems: [emptyLineItem()],
    notes: "",
  };

  return (
    <InvoiceForm
      clients={clients}
      defaultValues={defaultValues}
      submitLabel="Save draft"
      cancelHref="/invoices"
      onSubmit={async (input) => {
        const invoice = await createInvoice.mutateAsync(input);
        showFlash(`${invoice.number} saved as draft.`);
        router.push(`/invoices/${invoice.id}`);
      }}
    />
  );
}
