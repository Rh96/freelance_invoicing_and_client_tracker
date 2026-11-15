import type { Client, ClientInput } from "@/domain/client";
import type { Invoice, InvoiceInput } from "@/domain/invoice";
import type { InvoiceStatus } from "@/domain/invoice-status";

/**
 * The app's only way to read and write data (ADR-002). v1 is backed by localStorage;
 * a database-backed implementation can replace it without touching components.
 * Every method is async, and every failure is a `RepositoryError`.
 */
export interface Repository {
  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client>;
  createClient(input: ClientInput): Promise<Client>;
  updateClient(id: string, input: ClientInput): Promise<Client>;
  archiveClient(id: string): Promise<Client>;

  listInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice>;
  /** Creates a Draft and assigns the next invoice number. */
  createInvoice(input: InvoiceInput): Promise<Invoice>;
  /** Only Draft invoices can be edited. */
  updateInvoice(id: string, input: InvoiceInput): Promise<Invoice>;
  /** Moves along an allowed transition and records `sentAt` / `paidAt`. */
  setInvoiceStatus(id: string, to: InvoiceStatus): Promise<Invoice>;
}

export type RepositoryErrorCode =
  | "not_found" // the id doesn't exist
  | "invalid_state" // e.g. editing a Sent invoice, or a disallowed status change
  | "validation" // input failed the Zod schema
  | "corrupt_data" // stored data can't be read (bad JSON, wrong version, bad shape)
  | "storage_unavailable" // storage is missing, blocked or full
  | "simulated_failure"; // failure injected to demo error states

export class RepositoryError extends Error {
  override readonly name = "RepositoryError";

  constructor(
    readonly code: RepositoryErrorCode,
    message: string,
    /** Field errors for `validation`, keyed by field path (e.g. `lineItems.0.quantity`). */
    readonly fieldErrors: Readonly<Record<string, string[]>> = {},
  ) {
    super(message);
  }
}

export function isRepositoryError(error: unknown): error is RepositoryError {
  return error instanceof RepositoryError;
}
