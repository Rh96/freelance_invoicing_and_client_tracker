import { z } from "zod";
import { invoiceNumbering } from "@/config/business";
import {
  clientInputSchema,
  clientSchema,
  type Client,
  type ClientInput,
} from "@/domain/client";
import {
  invoiceInputSchema,
  invoiceSchema,
  type Invoice,
  type InvoiceData,
  type InvoiceInput,
} from "@/domain/invoice";
import {
  canTransition,
  withStatus,
  type InvoiceStatus,
} from "@/domain/invoice-status";
import { RepositoryError, type Repository } from "./repository";

export const STORE_VERSION = 1;
export const DEFAULT_STORAGE_KEY = "invoice-tracker";

export const storeSchema = z.object({
  version: z.literal(STORE_VERSION),
  clients: z.array(clientSchema),
  invoices: z.array(invoiceSchema),
  nextInvoiceSeq: z.number().int().positive(),
});

export type Store = z.output<typeof storeSchema>;

/** The subset of the Web Storage API we use; lets tests pass an in-memory fake. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export type LocalStorageRepositoryOptions = {
  /** Defaults to `window.localStorage`, looked up on each call (it doesn't exist during SSR). */
  storage?: KeyValueStorage;
  storageKey?: string;
  /** Simulated network latency per call. Defaults to 200–600 ms; use 0 in tests. */
  latencyMs?: number | { min: number; max: number };
  /** Return true to make an operation fail with `simulated_failure` (demo error states). */
  shouldFail?: (operation: string) => boolean;
  now?: () => Date;
  generateId?: () => string;
  /**
   * Data to start from when nothing is stored yet, and what `resetData()` restores.
   * Saved on first read so ids stay stable. Defaults to an empty store; the app passes the demo seed.
   */
  initialData?: () => Store;
};

export function emptyStore(): Store {
  return {
    version: STORE_VERSION,
    clients: [],
    invoices: [],
    nextInvoiceSeq: 1,
  };
}

export function formatInvoiceNumber(seq: number): string {
  return `${invoiceNumbering.prefix}-${String(seq).padStart(invoiceNumbering.digits, "0")}`;
}

function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw new RepositoryError(
    "validation",
    "Some fields are invalid",
    fieldErrors,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createLocalStorageRepository(
  options: LocalStorageRepositoryOptions = {},
): Repository {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    latencyMs = { min: 200, max: 600 },
    shouldFail = () => false,
    now = () => new Date(),
    generateId = () => crypto.randomUUID(),
    initialData = emptyStore,
  } = options;

  function getStorage(): KeyValueStorage {
    try {
      const storage = options.storage ?? globalThis.localStorage;
      if (storage) return storage;
    } catch {
      // Accessing localStorage throws when site data is blocked; handled below.
    }
    throw new RepositoryError(
      "storage_unavailable",
      "Browser storage is not available",
    );
  }

  function readStore(): Store {
    const raw = getStorage().getItem(storageKey);
    if (raw === null) {
      const store = initialData();
      writeStore(store);
      return store;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new RepositoryError(
        "corrupt_data",
        "Stored data is not valid JSON",
      );
    }
    const version = (json as { version?: unknown } | null)?.version;
    if (version !== STORE_VERSION) {
      throw new RepositoryError(
        "corrupt_data",
        `Stored data version ${String(version)} is not supported (expected ${STORE_VERSION})`,
      );
    }
    const result = storeSchema.safeParse(json);
    if (!result.success) {
      throw new RepositoryError(
        "corrupt_data",
        `Stored data has an invalid shape: ${z.prettifyError(result.error)}`,
      );
    }
    return result.data;
  }

  function writeStore(store: Store): void {
    try {
      getStorage().setItem(storageKey, JSON.stringify(store));
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        "storage_unavailable",
        "Could not save: browser storage is full or blocked",
      );
    }
  }

  /** Every public call goes through here: latency, then optional injected failure, then the work. */
  async function run<T>(operation: string, work: () => T): Promise<T> {
    const ms =
      typeof latencyMs === "number"
        ? latencyMs
        : latencyMs.min + Math.random() * (latencyMs.max - latencyMs.min);
    if (ms > 0) await delay(ms);
    if (shouldFail(operation)) {
      throw new RepositoryError(
        "simulated_failure",
        `Simulated failure in ${operation}`,
      );
    }
    return work();
  }

  function findClient(store: Store, id: string): Client {
    const client = store.clients.find((c) => c.id === id);
    if (!client)
      throw new RepositoryError("not_found", `Client ${id} not found`);
    return client;
  }

  function findInvoice(store: Store, id: string): Invoice {
    const invoice = store.invoices.find((i) => i.id === id);
    if (!invoice)
      throw new RepositoryError("not_found", `Invoice ${id} not found`);
    return invoice;
  }

  /** The client must exist, and be active unless the invoice already belonged to them. */
  function assertBillableClient(
    store: Store,
    clientId: string,
    currentClientId?: string,
  ): void {
    const client = store.clients.find((c) => c.id === clientId);
    if (!client) {
      throw new RepositoryError("validation", "Some fields are invalid", {
        clientId: ["Client not found"],
      });
    }
    if (client.archivedAt !== null && clientId !== currentClientId) {
      throw new RepositoryError("validation", "Some fields are invalid", {
        clientId: ["This client is archived"],
      });
    }
  }

  function toLineItems(data: InvoiceData): Invoice["lineItems"] {
    return data.lineItems.map((item) => ({ ...item, id: generateId() }));
  }

  return {
    listClients: () =>
      run("listClients", () =>
        readStore().clients.sort((a, b) => a.name.localeCompare(b.name)),
      ),

    getClient: (id) => run("getClient", () => findClient(readStore(), id)),

    createClient: (input: ClientInput) =>
      run("createClient", () => {
        const data = parseInput(clientInputSchema, input);
        const store = readStore();
        const timestamp = now().toISOString();
        const client: Client = {
          ...data,
          id: generateId(),
          archivedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        store.clients.push(client);
        writeStore(store);
        return client;
      }),

    updateClient: (id, input) =>
      run("updateClient", () => {
        const data = parseInput(clientInputSchema, input);
        const store = readStore();
        const client = findClient(store, id);
        Object.assign(client, data, { updatedAt: now().toISOString() });
        writeStore(store);
        return client;
      }),

    archiveClient: (id) =>
      run("archiveClient", () => {
        const store = readStore();
        const client = findClient(store, id);
        if (client.archivedAt === null) {
          const timestamp = now().toISOString();
          client.archivedAt = timestamp;
          client.updatedAt = timestamp;
          writeStore(store);
        }
        return client;
      }),

    listInvoices: () =>
      run("listInvoices", () =>
        // Newest first; numbers are zero-padded, so string order is numeric order.
        readStore().invoices.sort((a, b) => b.number.localeCompare(a.number)),
      ),

    getInvoice: (id) => run("getInvoice", () => findInvoice(readStore(), id)),

    createInvoice: (input: InvoiceInput) =>
      run("createInvoice", () => {
        const data = parseInput(invoiceInputSchema, input);
        const store = readStore();
        assertBillableClient(store, data.clientId);
        const timestamp = now().toISOString();
        const invoice: Invoice = {
          ...data,
          lineItems: toLineItems(data),
          id: generateId(),
          number: formatInvoiceNumber(store.nextInvoiceSeq),
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
          sentAt: null,
          paidAt: null,
        };
        store.nextInvoiceSeq += 1;
        store.invoices.push(invoice);
        writeStore(store);
        return invoice;
      }),

    updateInvoice: (id, input) =>
      run("updateInvoice", () => {
        const store = readStore();
        const invoice = findInvoice(store, id);
        if (invoice.status !== "draft") {
          throw new RepositoryError(
            "invalid_state",
            `Invoice ${invoice.number} is ${invoice.status} and can no longer be edited`,
          );
        }
        const data = parseInput(invoiceInputSchema, input);
        assertBillableClient(store, data.clientId, invoice.clientId);
        Object.assign(invoice, data, {
          lineItems: toLineItems(data),
          updatedAt: now().toISOString(),
        });
        writeStore(store);
        return invoice;
      }),

    setInvoiceStatus: (id, to: InvoiceStatus) =>
      run("setInvoiceStatus", () => {
        const store = readStore();
        const invoice = findInvoice(store, id);
        if (!canTransition(invoice.status, to)) {
          throw new RepositoryError(
            "invalid_state",
            `Invoice ${invoice.number} can't go from ${invoice.status} to ${to}`,
          );
        }
        const updated = withStatus(invoice, to, now().toISOString());
        store.invoices[store.invoices.indexOf(invoice)] = updated;
        writeStore(store);
        return updated;
      }),

    resetData: () =>
      run("resetData", () => {
        // Never reads the old data, so it also recovers from corrupt storage.
        writeStore(initialData());
      }),
  };
}
