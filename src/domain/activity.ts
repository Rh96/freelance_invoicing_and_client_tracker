import type { Client } from "./client";
import type { Invoice } from "./invoice";

/**
 * Recent activity, derived from timestamps the records already have (ADR-005): no event log.
 * Consequence: "Mark as unpaid" clears `paidAt`, so that invoice's "paid" event disappears.
 */
export type ActivityEvent =
  | { kind: "client_created"; id: string; at: string; client: Client }
  | {
      kind: "invoice_created" | "invoice_sent" | "invoice_paid";
      id: string;
      at: string;
      invoice: Invoice;
      /** Undefined only if the client record is missing. */
      client: Client | undefined;
    };

/** For identical timestamps: the later step in an invoice's life comes first. */
const KIND_ORDER: Record<ActivityEvent["kind"], number> = {
  invoice_paid: 0,
  invoice_sent: 1,
  invoice_created: 2,
  client_created: 3,
};

export function buildActivity(
  clients: readonly Client[],
  invoices: readonly Invoice[],
  limit = 10,
): ActivityEvent[] {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const events: ActivityEvent[] = clients.map((client) => ({
    kind: "client_created",
    id: `client_created:${client.id}`,
    at: client.createdAt,
    client,
  }));

  for (const invoice of invoices) {
    const client = clientsById.get(invoice.clientId);
    const add = (
      kind: "invoice_created" | "invoice_sent" | "invoice_paid",
      at: string | null,
    ) => {
      if (at)
        events.push({ kind, id: `${kind}:${invoice.id}`, at, invoice, client });
    };
    add("invoice_created", invoice.createdAt);
    add("invoice_sent", invoice.sentAt);
    add("invoice_paid", invoice.paidAt);
  }

  return events
    .sort(
      (a, b) =>
        b.at.localeCompare(a.at) || // ISO timestamps sort as strings
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
