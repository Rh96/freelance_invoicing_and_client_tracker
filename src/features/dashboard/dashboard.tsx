"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import type { Client } from "@/domain/client";
import type { Invoice } from "@/domain/invoice";
import { toIsoDate } from "@/domain/invoice-status";
import { formatMoney } from "@/domain/money";
import { useClients } from "@/features/clients/queries";
import { useInvoices } from "@/features/invoices/queries";
import { moneySummary, overdueInvoices } from "./dashboard-stats";
import { RecentActivity } from "./recent-activity";

export function Dashboard() {
  const invoicesQuery = useInvoices();
  const clientsQuery = useClients();

  if (invoicesQuery.status === "pending" || clientsQuery.status === "pending") {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading dashboard…
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-28 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="h-40 animate-pulse rounded-md bg-muted"
        />
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
            <p>Couldn&apos;t load the dashboard.</p>
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
    return (
      <div className="space-y-3 rounded-md border p-6">
        <p>No invoices yet. Your totals and overdue invoices will show here.</p>
        <Button asChild>
          <Link href="/invoices/new">Create your first invoice</Link>
        </Button>
      </div>
    );
  }

  return (
    <DashboardContent
      invoices={invoicesQuery.data}
      clients={clientsQuery.data}
    />
  );
}

/** Rendered after data loads, so "today" (for Overdue) is read in the browser on each visit. */
function DashboardContent({
  invoices,
  clients,
}: {
  invoices: readonly Invoice[];
  clients: readonly Client[];
}) {
  const now = new Date();
  const today = toIsoDate(now);
  const summary = useMemo(() => moneySummary(invoices), [invoices]);
  const overdue = useMemo(
    () => overdueInvoices(invoices, today),
    [invoices, today],
  );
  const clientsById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );
  const overdueCents = overdue.reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <div className="space-y-8">
      <section aria-labelledby="totals-title">
        <h2 id="totals-title" className="sr-only">
          Totals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Outstanding"
            amount={formatMoney(summary.outstandingCents)}
            detail={plural(summary.outstandingCount, "unpaid invoice")}
          />
          <StatCard
            label="Paid"
            amount={formatMoney(summary.paidCents)}
            detail={plural(summary.paidCount, "paid invoice")}
          />
        </div>
      </section>

      <section aria-labelledby="overdue-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="overdue-title" className="text-lg font-semibold">
            Overdue
          </h2>
          {overdue.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {overdue.length} overdue · {formatMoney(overdueCents)}
            </p>
          )}
        </div>
        {overdue.length === 0 ? (
          <p className="text-muted-foreground">Nothing overdue.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {overdue.map(({ invoice, totalCents, daysOverdue }) => {
              const client = clientsById.get(invoice.clientId);
              return (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-3">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                    {client ? (
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {client.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        Unknown client
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-4">
                    <span className="text-destructive">
                      {plural(daysOverdue, "day")} overdue
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(totalCents)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RecentActivity clients={clients} invoices={invoices} now={now} />
    </div>
  );
}

function StatCard({
  label,
  amount,
  detail,
}: {
  label: string;
  amount: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{amount}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
