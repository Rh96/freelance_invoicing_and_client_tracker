import { beforeEach, describe, expect, it } from "vitest";
import { createSeedStore } from "./seed";
import type { InvoiceInput } from "@/domain/invoice";
import {
  createLocalStorageRepository,
  DEFAULT_STORAGE_KEY,
  type KeyValueStorage,
  type LocalStorageRepositoryOptions,
} from "./local-storage-repository";
import {
  RepositoryError,
  type Repository,
  type RepositoryErrorCode,
} from "./repository";

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

/** A clock that advances one minute per call, so timestamps are distinct and predictable. */
function steppedClock(start = "2026-11-15T09:00:00.000Z") {
  let t = new Date(start).getTime();
  return () => {
    const d = new Date(t);
    t += 60_000;
    return d;
  };
}

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

async function expectRepoError(
  promise: Promise<unknown>,
  code: RepositoryErrorCode,
) {
  const error = await promise.then(
    () => {
      throw new Error("expected a RepositoryError");
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(RepositoryError);
  expect((error as RepositoryError).code).toBe(code);
  return error as RepositoryError;
}

const ACME = {
  name: "Acme Ltd",
  email: "billing@acme.test",
  company: "Acme",
  address: "1 Main St",
};

function invoiceInput(
  clientId: string,
  overrides: Partial<InvoiceInput> = {},
): InvoiceInput {
  return {
    clientId,
    issueDate: "2026-11-15",
    dueDate: "2026-11-29",
    taxRateBps: 2000,
    lineItems: [
      { description: "Design work", quantity: 10, unitPriceCents: 7500 },
    ],
    ...overrides,
  };
}

let storage: ReturnType<typeof memoryStorage>;
let repo: Repository;

function makeRepo(overrides: LocalStorageRepositoryOptions = {}) {
  return createLocalStorageRepository({
    storage,
    latencyMs: 0,
    now: steppedClock(),
    generateId: sequentialIds(),
    ...overrides,
  });
}

beforeEach(() => {
  storage = memoryStorage();
  repo = makeRepo();
});

describe("clients", () => {
  it("starts empty when nothing is stored", async () => {
    expect(await repo.listClients()).toEqual([]);
  });

  it("creates a client with trimmed fields, defaults and timestamps", async () => {
    const client = await repo.createClient({
      name: "  Jane Doe ",
      email: "jane@doe.test",
    });
    expect(client).toEqual({
      id: "id-1",
      name: "Jane Doe",
      email: "jane@doe.test",
      company: "",
      address: "",
      archivedAt: null,
      createdAt: "2026-11-15T09:00:00.000Z",
      updatedAt: "2026-11-15T09:00:00.000Z",
    });
  });

  it("persists across repository instances sharing the same storage", async () => {
    await repo.createClient(ACME);
    const other = makeRepo();
    expect(await other.listClients()).toHaveLength(1);
  });

  it("lists clients sorted by name", async () => {
    await repo.createClient({ ...ACME, name: "Zeta" });
    await repo.createClient({ ...ACME, name: "alpha" });
    await repo.createClient({ ...ACME, name: "Beta" });
    expect((await repo.listClients()).map((c) => c.name)).toEqual([
      "alpha",
      "Beta",
      "Zeta",
    ]);
  });

  it("returns field errors for invalid input and saves nothing", async () => {
    const error = await expectRepoError(
      repo.createClient({ name: " ", email: "not-an-email" }),
      "validation",
    );
    expect(error.fieldErrors).toEqual({
      name: ["Name is required"],
      email: ["Enter a valid email address"],
    });
    expect(storage.data.size).toBe(0);
  });

  it("updates a client and bumps updatedAt only", async () => {
    const created = await repo.createClient(ACME);
    const updated = await repo.updateClient(created.id, {
      ...ACME,
      name: "Acme Inc",
    });
    expect(updated.name).toBe("Acme Inc");
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    expect((await repo.getClient(created.id)).name).toBe("Acme Inc");
  });

  it("archives a client once; archiving again changes nothing", async () => {
    const { id } = await repo.createClient(ACME);
    const archived = await repo.archiveClient(id);
    expect(archived.archivedAt).not.toBeNull();
    expect(await repo.archiveClient(id)).toEqual(archived);
  });

  it("throws not_found for unknown ids", async () => {
    await expectRepoError(repo.getClient("nope"), "not_found");
    await expectRepoError(repo.updateClient("nope", ACME), "not_found");
    await expectRepoError(repo.archiveClient("nope"), "not_found");
  });
});

describe("invoices", () => {
  let clientId: string;

  beforeEach(async () => {
    clientId = (await repo.createClient(ACME)).id;
  });

  it("creates a Draft with the next number and line item ids", async () => {
    const invoice = await repo.createInvoice(invoiceInput(clientId));
    expect(invoice).toMatchObject({
      number: "INV-0001",
      status: "draft",
      notes: "",
      sentAt: null,
      paidAt: null,
    });
    expect(invoice.lineItems[0]?.id).toEqual(expect.any(String));
  });

  it("numbers invoices sequentially and lists newest first", async () => {
    await repo.createInvoice(invoiceInput(clientId));
    await repo.createInvoice(invoiceInput(clientId));
    await repo.createInvoice(invoiceInput(clientId));
    expect((await repo.listInvoices()).map((i) => i.number)).toEqual([
      "INV-0003",
      "INV-0002",
      "INV-0001",
    ]);
  });

  it("allows an empty draft", async () => {
    const invoice = await repo.createInvoice(
      invoiceInput(clientId, { lineItems: [] }),
    );
    expect(invoice.lineItems).toEqual([]);
  });

  it("rejects a due date before the issue date and nested line item errors", async () => {
    const error = await expectRepoError(
      repo.createInvoice(
        invoiceInput(clientId, {
          dueDate: "2026-11-01",
          lineItems: [{ description: "", quantity: 1.005, unitPriceCents: -1 }],
        }),
      ),
      "validation",
    );
    expect(Object.keys(error.fieldErrors).sort()).toEqual([
      "dueDate",
      "lineItems.0.description",
      "lineItems.0.quantity",
      "lineItems.0.unitPriceCents",
    ]);
  });

  it("rejects unknown and archived clients", async () => {
    const unknown = await expectRepoError(
      repo.createInvoice(invoiceInput("nope")),
      "validation",
    );
    expect(unknown.fieldErrors.clientId).toEqual(["Client not found"]);

    await repo.archiveClient(clientId);
    const archived = await expectRepoError(
      repo.createInvoice(invoiceInput(clientId)),
      "validation",
    );
    expect(archived.fieldErrors.clientId).toEqual(["This client is archived"]);
  });

  it("edits a Draft, keeping it on a client archived since it was created", async () => {
    const draft = await repo.createInvoice(invoiceInput(clientId));
    await repo.archiveClient(clientId);
    const updated = await repo.updateInvoice(
      draft.id,
      invoiceInput(clientId, { notes: "Thanks!" }),
    );
    expect(updated.notes).toBe("Thanks!");
    expect(updated.number).toBe(draft.number);
  });

  it("refuses to edit a Sent invoice", async () => {
    const draft = await repo.createInvoice(invoiceInput(clientId));
    await repo.setInvoiceStatus(draft.id, "sent");
    await expectRepoError(
      repo.updateInvoice(draft.id, invoiceInput(clientId)),
      "invalid_state",
    );
  });

  it("records sentAt and paidAt, and clears paidAt on undo", async () => {
    const { id } = await repo.createInvoice(invoiceInput(clientId));

    const sent = await repo.setInvoiceStatus(id, "sent");
    expect(sent.status).toBe("sent");
    expect(sent.sentAt).not.toBeNull();

    const paid = await repo.setInvoiceStatus(id, "paid");
    expect(paid.paidAt).not.toBeNull();

    const undone = await repo.setInvoiceStatus(id, "sent");
    expect(undone).toMatchObject({
      status: "sent",
      paidAt: null,
      sentAt: sent.sentAt,
    });
  });

  it("rejects disallowed transitions", async () => {
    const { id } = await repo.createInvoice(invoiceInput(clientId));
    await expectRepoError(repo.setInvoiceStatus(id, "paid"), "invalid_state");
    await expectRepoError(repo.setInvoiceStatus(id, "draft"), "invalid_state");
  });

  it("throws not_found for unknown invoice ids", async () => {
    await expectRepoError(repo.getInvoice("nope"), "not_found");
    await expectRepoError(repo.setInvoiceStatus("nope", "sent"), "not_found");
  });
});

describe("stored data", () => {
  it.each([
    ["invalid JSON", "{not json"],
    [
      "an unsupported version",
      JSON.stringify({
        version: 99,
        clients: [],
        invoices: [],
        nextInvoiceSeq: 1,
      }),
    ],
    [
      "an invalid shape",
      JSON.stringify({
        version: 1,
        clients: [{ id: 1 }],
        invoices: [],
        nextInvoiceSeq: 1,
      }),
    ],
  ])("reports corrupt_data for %s", async (_label, raw) => {
    storage.data.set(DEFAULT_STORAGE_KEY, raw);
    await expectRepoError(repo.listClients(), "corrupt_data");
  });

  it("names the unsupported version, so a future migration knows what it's reading", async () => {
    storage.data.set(
      DEFAULT_STORAGE_KEY,
      JSON.stringify({
        version: 99,
        clients: [],
        invoices: [],
        nextInvoiceSeq: 1,
      }),
    );
    const error = await expectRepoError(repo.listClients(), "corrupt_data");
    expect(error.message).toContain("version 99 is not supported");
  });

  it("reports storage_unavailable when writing fails", async () => {
    const full: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    await expectRepoError(
      makeRepo({ storage: full }).createClient(ACME),
      "storage_unavailable",
    );
  });
});

describe("simulation", () => {
  it("fails only the operations the toggle selects", async () => {
    const flaky = makeRepo({ shouldFail: (op) => op === "createClient" });
    await expectRepoError(flaky.createClient(ACME), "simulated_failure");
    expect(await flaky.listClients()).toEqual([]);
  });

  it("waits for the configured latency", async () => {
    const slow = makeRepo({ latencyMs: 30 });
    const start = performance.now();
    await slow.listClients();
    expect(performance.now() - start).toBeGreaterThanOrEqual(25);
  });
});

describe("initial data and reset", () => {
  const seeded = () =>
    makeRepo({
      initialData: () =>
        createSeedStore({
          now: new Date("2026-11-15T10:00:00.000Z"),
          generateId: sequentialIds(),
        }),
    });

  it("saves the initial data on first read, so ids stay stable", async () => {
    const first = await seeded().listClients();
    expect(first.length).toBeGreaterThan(0);
    expect(storage.data.has(DEFAULT_STORAGE_KEY)).toBe(true);
    // A second instance reads what was saved instead of seeding again.
    const again = await makeRepo().listClients();
    expect(again.map((c) => c.id)).toEqual(first.map((c) => c.id));
  });

  it("continues invoice numbering after the seeded invoices", async () => {
    const repo = seeded();
    const [client] = (await repo.listClients()).filter(
      (c) => c.archivedAt === null,
    );
    const invoice = await repo.createInvoice(invoiceInput(client!.id));
    expect(invoice.number).toBe("INV-0009");
  });

  it("restores the initial data after changes", async () => {
    const repo = seeded();
    const before = await repo.listInvoices();
    await repo.setInvoiceStatus(
      before.find((i) => i.status === "draft")!.id,
      "sent",
    );
    await repo.createClient(ACME);

    await repo.resetData();

    expect(
      (await repo.listInvoices()).map((i) => [i.number, i.status]),
    ).toEqual(before.map((i) => [i.number, i.status]));
    expect((await repo.listClients()).some((c) => c.name === ACME.name)).toBe(
      false,
    );
  });

  it("recovers from corrupt stored data", async () => {
    storage.data.set(DEFAULT_STORAGE_KEY, "{not json");
    const repo = seeded();
    await expectRepoError(repo.listClients(), "corrupt_data");
    await repo.resetData();
    expect((await repo.listClients()).length).toBeGreaterThan(0);
  });

  it("can fail like any other call (demo error states)", async () => {
    const flaky = makeRepo({ shouldFail: (op) => op === "resetData" });
    await expectRepoError(flaky.resetData(), "simulated_failure");
  });
});
