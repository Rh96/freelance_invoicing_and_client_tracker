import Link from "next/link";
import type { ReactNode } from "react";
import { buildActivity, type ActivityEvent } from "@/domain/activity";
import type { Client } from "@/domain/client";
import { formatDateTime, formatRelativeTime } from "@/domain/dates";
import type { Invoice } from "@/domain/invoice";

const linkClass = "font-medium underline-offset-4 hover:underline";

/** Latest 10 events. `now` comes from the caller, which reads the clock only after data loads. */
export function RecentActivity({
  clients,
  invoices,
  now,
}: {
  clients: readonly Client[];
  invoices: readonly Invoice[];
  now: Date;
}) {
  const events = buildActivity(clients, invoices);

  return (
    <section aria-labelledby="activity-title" className="space-y-3">
      <h2 id="activity-title" className="text-lg font-semibold">
        Recent activity
      </h2>
      {events.length === 0 ? (
        <p className="text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="divide-y rounded-md border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
            >
              <p>{describe(event)}</p>
              <time
                dateTime={event.at}
                title={formatDateTime(event.at)}
                className="shrink-0 text-muted-foreground"
              >
                {formatRelativeTime(event.at, now)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function describe(event: ActivityEvent): ReactNode {
  if (event.kind === "client_created") {
    return (
      <>
        <ClientLink client={event.client} /> added as a client
      </>
    );
  }
  const invoiceLink = (
    <Link href={`/invoices/${event.invoice.id}`} className={linkClass}>
      {event.invoice.number}
    </Link>
  );
  const client = <ClientLink client={event.client} />;
  switch (event.kind) {
    case "invoice_created":
      return (
        <>
          {invoiceLink} created for {client}
        </>
      );
    case "invoice_sent":
      return (
        <>
          {invoiceLink} sent to {client}
        </>
      );
    case "invoice_paid":
      return (
        <>
          {invoiceLink} paid by {client}
        </>
      );
  }
}

function ClientLink({ client }: { client: Client | undefined }) {
  if (!client) return <>an unknown client</>;
  return (
    <Link href={`/clients/${client.id}`} className={linkClass}>
      {client.name}
    </Link>
  );
}
