import { describe, expect, it } from "vitest";
import { buildActivity } from "./activity";
import type { Client } from "./client";
import type { Invoice } from "./invoice";

const t = (day: number, hour = 9) =>
  new Date(Date.UTC(2026, 10, day, hour)).toISOString();

function client(id: string, name: string, createdAt: string): Client {
  return {
    id,
    name,
    email: `${id}@x.example`,
    company: "",
    address: "",
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function invoice(
  id: string,
  clientId: string,
  times: { created: string; sent?: string; paid?: string },
): Invoice {
  return {
    id,
    number: id.toUpperCase(),
    clientId,
    status: times.paid ? "paid" : times.sent ? "sent" : "draft",
    issueDate: "2026-11-01",
    dueDate: "2026-12-01",
    taxRateBps: 0,
    lineItems: [],
    notes: "",
    createdAt: times.created,
    updatedAt: times.paid ?? times.sent ?? times.created,
    sentAt: times.sent ?? null,
    paidAt: times.paid ?? null,
  };
}

const maya = client("c1", "Maya Chen", t(1));
const omar = client("c2", "Omar Haddad", t(2));
const inv1 = invoice("inv-1", "c1", { created: t(3), sent: t(4), paid: t(10) });
const inv2 = invoice("inv-2", "c2", { created: t(5), sent: t(6) });
const inv3 = invoice("inv-3", "c1", { created: t(8) }); // draft

describe("buildActivity", () => {
  it("lists every event type, newest first", () => {
    expect(
      buildActivity([maya, omar], [inv1, inv2, inv3]).map((e) => e.id),
    ).toEqual([
      "invoice_paid:inv-1",
      "invoice_created:inv-3",
      "invoice_sent:inv-2",
      "invoice_created:inv-2",
      "invoice_sent:inv-1",
      "invoice_created:inv-1",
      "client_created:c2",
      "client_created:c1",
    ]);
  });

  it("attaches the client to invoice events", () => {
    const [paid] = buildActivity([maya, omar], [inv1]);
    expect(paid).toMatchObject({
      kind: "invoice_paid",
      invoice: inv1,
      client: maya,
      at: t(10),
    });
  });

  it("keeps only the latest events", () => {
    expect(
      buildActivity([maya, omar], [inv1, inv2, inv3], 3).map((e) => e.id),
    ).toEqual([
      "invoice_paid:inv-1",
      "invoice_created:inv-3",
      "invoice_sent:inv-2",
    ]);
  });

  it("drops the paid event after Mark as unpaid (paidAt cleared)", () => {
    const unpaid = { ...inv1, status: "sent" as const, paidAt: null };
    expect(buildActivity([], [unpaid]).map((e) => e.kind)).toEqual([
      "invoice_sent",
      "invoice_created",
    ]);
  });

  it("orders events with the same timestamp by lifecycle step, then id", () => {
    const sameTime = invoice("inv-9", "c1", {
      created: t(12),
      sent: t(12),
      paid: t(12),
    });
    const newClient = client("c9", "Jane Doe", t(12));
    expect(buildActivity([newClient], [sameTime]).map((e) => e.kind)).toEqual([
      "invoice_paid",
      "invoice_sent",
      "invoice_created",
      "client_created",
    ]);
  });

  it("returns nothing for no data", () => {
    expect(buildActivity([], [])).toEqual([]);
  });
});
