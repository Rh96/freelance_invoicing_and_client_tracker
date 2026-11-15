import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  canTransition,
  displayStatus,
  isOverdue,
  toIsoDate,
  withStatus,
  type InvoiceStatus,
} from "./invoice-status";

const TODAY = "2026-11-13";

describe("canTransition", () => {
  it.each<[InvoiceStatus, InvoiceStatus, boolean]>([
    ["draft", "sent", true],
    ["sent", "paid", true],
    ["paid", "sent", true],
    ["draft", "paid", false],
    ["sent", "draft", false],
    ["paid", "draft", false],
    ["draft", "draft", false],
    ["sent", "sent", false],
  ])("%s → %s is %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("lists the allowed next statuses", () => {
    expect(allowedTransitions("paid")).toEqual(["sent"]);
  });
});

describe("isOverdue", () => {
  it("is overdue when sent and due before today", () => {
    expect(isOverdue({ status: "sent", dueDate: "2026-11-12" }, TODAY)).toBe(
      true,
    );
  });

  it("is not overdue on the due date itself", () => {
    expect(isOverdue({ status: "sent", dueDate: TODAY }, TODAY)).toBe(false);
  });

  it("is not overdue before the due date", () => {
    expect(isOverdue({ status: "sent", dueDate: "2026-11-14" }, TODAY)).toBe(
      false,
    );
  });

  it("compares across month and year boundaries", () => {
    expect(
      isOverdue({ status: "sent", dueDate: "2025-12-31" }, "2026-01-01"),
    ).toBe(true);
  });

  it.each<InvoiceStatus>(["draft", "paid"])(
    "is never overdue when %s",
    (status) => {
      expect(isOverdue({ status, dueDate: "2020-01-01" }, TODAY)).toBe(false);
    },
  );

  it.each(["2026-1-5", "13/11/2026", ""])(
    "rejects malformed date %j",
    (date) => {
      expect(() => isOverdue({ status: "sent", dueDate: date }, TODAY)).toThrow(
        RangeError,
      );
      expect(() => isOverdue({ status: "sent", dueDate: TODAY }, date)).toThrow(
        RangeError,
      );
    },
  );
});

describe("displayStatus", () => {
  it("shows overdue for a late sent invoice", () => {
    expect(
      displayStatus({ status: "sent", dueDate: "2026-11-01" }, TODAY),
    ).toBe("overdue");
  });

  it.each<InvoiceStatus>(["draft", "sent", "paid"])(
    "shows the stored status %s otherwise",
    (status) => {
      expect(displayStatus({ status, dueDate: "2026-12-01" }, TODAY)).toBe(
        status,
      );
    },
  );
});

describe("toIsoDate", () => {
  it("uses the local calendar date with zero padding", () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(toIsoDate(new Date(2026, 10, 13, 0, 0))).toBe("2026-11-13");
  });
});

describe("withStatus", () => {
  const base = {
    status: "draft" as InvoiceStatus,
    sentAt: null,
    paidAt: null,
    updatedAt: "2026-11-01T00:00:00.000Z",
    number: "INV-0001",
  };
  const T1 = "2026-11-10T09:00:00.000Z";
  const T2 = "2026-11-12T09:00:00.000Z";
  const T3 = "2026-11-13T09:00:00.000Z";

  it("records sentAt, then paidAt, and clears paidAt on undo", () => {
    const sent = withStatus(base, "sent", T1);
    expect(sent).toEqual({
      ...base,
      status: "sent",
      sentAt: T1,
      updatedAt: T1,
    });

    const paid = withStatus(sent, "paid", T2);
    expect(paid).toMatchObject({
      status: "paid",
      sentAt: T1,
      paidAt: T2,
      updatedAt: T2,
    });

    const undone = withStatus(paid, "sent", T3);
    expect(undone).toMatchObject({
      status: "sent",
      sentAt: T1,
      paidAt: null,
      updatedAt: T3,
    });
  });

  it("returns a copy and keeps other fields", () => {
    const sent = withStatus(base, "sent", T1);
    expect(sent).not.toBe(base);
    expect(base.status).toBe("draft");
    expect(sent.number).toBe("INV-0001");
  });

  it("rejects transitions that aren't allowed", () => {
    expect(() => withStatus(base, "paid", T1)).toThrow(RangeError);
  });
});
