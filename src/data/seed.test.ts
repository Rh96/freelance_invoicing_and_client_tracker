import { describe, expect, it } from "vitest";
import { displayStatus, toIsoDate } from "@/domain/invoice-status";
import { storeSchema } from "./local-storage-repository";
import { createSeedStore } from "./seed";

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

// Two very different "today"s prove the demo doesn't go stale over time.
const NOWS = [
  new Date("2026-11-15T10:00:00.000Z"),
  new Date("2028-03-01T10:00:00.000Z"),
];

describe.each(NOWS)("createSeedStore at %s", (now) => {
  const store = createSeedStore({ now, generateId: sequentialIds() });
  const today = toIsoDate(now);

  it("produces data the repository accepts", () => {
    expect(storeSchema.safeParse(store).success).toBe(true);
  });

  it("shows every status, including overdue", () => {
    const statuses = new Set(
      store.invoices.map((i) => displayStatus(i, today)),
    );
    expect([...statuses].sort()).toEqual(["draft", "overdue", "paid", "sent"]);
  });

  it("puts no timestamp in the future", () => {
    const nowIso = now.toISOString();
    const timestamps = [
      ...store.clients.flatMap((c) => [c.createdAt, c.updatedAt, c.archivedAt]),
      ...store.invoices.flatMap((i) => [
        i.createdAt,
        i.updatedAt,
        i.sentAt,
        i.paidAt,
      ]),
    ].filter((t): t is string => t !== null);
    expect(timestamps.every((t) => t <= nowIso)).toBe(true);
  });
});

describe("createSeedStore consistency", () => {
  const store = createSeedStore({ generateId: sequentialIds() });

  it("links every invoice to a seeded client", () => {
    const clientIds = new Set(store.clients.map((c) => c.id));
    expect(store.invoices.every((i) => clientIds.has(i.clientId))).toBe(true);
  });

  it("has one archived client that still has invoice history", () => {
    const archived = store.clients.filter((c) => c.archivedAt !== null);
    expect(archived).toHaveLength(1);
    expect(store.invoices.some((i) => i.clientId === archived[0]?.id)).toBe(
      true,
    );
  });

  it("matches timestamps to status", () => {
    for (const invoice of store.invoices) {
      expect(invoice.sentAt !== null).toBe(invoice.status !== "draft");
      expect(invoice.paidAt !== null).toBe(invoice.status === "paid");
    }
  });

  it("numbers invoices uniquely and continues the sequence after them", () => {
    const numbers = store.invoices.map((i) => i.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(store.nextInvoiceSeq).toBe(store.invoices.length + 1);
  });

  it("uses unique ids across clients, invoices and line items", () => {
    const ids = [
      ...store.clients.map((c) => c.id),
      ...store.invoices.flatMap((i) => [i.id, ...i.lineItems.map((l) => l.id)]),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
