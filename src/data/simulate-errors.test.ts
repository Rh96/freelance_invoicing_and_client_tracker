import { describe, expect, it } from "vitest";
import {
  parseSimulateErrors,
  resolveSimulateErrors,
  shouldFailFor,
} from "./simulate-errors";

function memorySession() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("parseSimulateErrors", () => {
  it.each([
    ["off", "off"],
    ["writes", "writes"],
    ["all", "all"],
    ["1", null],
    ["", null],
    [null, null],
  ])("%j → %j", (value, expected) => {
    expect(parseSimulateErrors(value)).toBe(expected);
  });
});

describe("shouldFailFor", () => {
  it("fails nothing when off", () => {
    expect(shouldFailFor("off", "createClient")).toBe(false);
    expect(shouldFailFor("off", "listClients")).toBe(false);
  });

  it("fails only writes in writes mode", () => {
    expect(shouldFailFor("writes", "listClients")).toBe(false);
    expect(shouldFailFor("writes", "getInvoice")).toBe(false);
    expect(shouldFailFor("writes", "createClient")).toBe(true);
    expect(shouldFailFor("writes", "setInvoiceStatus")).toBe(true);
    expect(shouldFailFor("writes", "resetData")).toBe(true);
  });

  it("fails everything in all mode", () => {
    expect(shouldFailFor("all", "listInvoices")).toBe(true);
  });
});

describe("resolveSimulateErrors", () => {
  it("uses and remembers the URL value", () => {
    const session = memorySession();
    expect(resolveSimulateErrors("?simulateErrors=writes", session)).toBe(
      "writes",
    );
    // Later navigation drops the query string; the tab still remembers.
    expect(resolveSimulateErrors("", session)).toBe("writes");
  });

  it("lets ?simulateErrors=off clear the remembered value", () => {
    const session = memorySession();
    resolveSimulateErrors("?simulateErrors=all", session);
    expect(resolveSimulateErrors("?simulateErrors=off", session)).toBe("off");
    expect(resolveSimulateErrors("", session)).toBe("off");
  });

  it("ignores unknown values and defaults to off", () => {
    expect(resolveSimulateErrors("?simulateErrors=yes", memorySession())).toBe(
      "off",
    );
    expect(resolveSimulateErrors("", undefined)).toBe("off");
  });

  it("still applies the URL value when sessionStorage throws", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(resolveSimulateErrors("?simulateErrors=all", blocked)).toBe("all");
    expect(resolveSimulateErrors("", blocked)).toBe("off");
  });
});
