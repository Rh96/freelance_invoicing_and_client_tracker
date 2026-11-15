import { describe, expect, it } from "vitest";
import type { Client } from "@/domain/client";
import { filterClients } from "./filter-clients";

function client(overrides: Partial<Client>): Client {
  return {
    id: overrides.name ?? "id",
    name: "Someone",
    email: "someone@x.example",
    company: "",
    address: "",
    archivedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

const maya = client({
  name: "Maya Chen",
  company: "Northwind Studio",
  email: "maya@northwind.example",
});
const omar = client({
  name: "Omar Haddad",
  company: "Brightline Labs",
  email: "ap@brightline.example",
});
const ana = client({
  name: "Ana Costa",
  company: "Old Pier Bakery",
  archivedAt: "2026-11-02T00:00:00.000Z",
});
const all = [maya, omar, ana];

describe("filterClients", () => {
  it("hides archived clients by default and keeps order", () => {
    expect(filterClients(all, "")).toEqual([maya, omar]);
  });

  it("includes archived clients when asked", () => {
    expect(filterClients(all, "", { includeArchived: true })).toEqual(all);
  });

  it.each([
    ["name", "maya", [maya]],
    ["company", "BRIGHTLINE", [omar]],
    ["email domain", "northwind.example", [maya]],
    ["surrounding spaces", "  omar  ", [omar]],
    ["a substring in several clients", "a", [maya, omar]],
    ["no match", "zzz", []],
  ])("matches by %s", (_label, search, expected) => {
    expect(filterClients(all, search)).toEqual(expected);
  });

  it("does not return archived matches by default", () => {
    expect(filterClients(all, "bakery")).toEqual([]);
    expect(filterClients(all, "bakery", { includeArchived: true })).toEqual([
      ana,
    ]);
  });
});
