import { describe, expect, it } from "vitest";
import { addDays, formatDate } from "./dates";

describe("addDays", () => {
  it.each([
    ["2026-11-15", 0, "2026-11-15"],
    ["2026-11-15", 14, "2026-11-29"],
    ["2026-11-15", -15, "2026-10-31"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2028-02-28", 1, "2028-02-29"], // leap year
    ["2027-02-28", 1, "2027-03-01"],
    ["2026-03-08", 1, "2026-03-09"], // US daylight-saving start
  ])("%s + %i days = %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  it.each([
    ["2026-1-5", 1],
    ["15/11/2026", 1],
    ["2026-11-15", 1.5],
  ])("rejects %j with %s days", (date, days) => {
    expect(() => addDays(date, days)).toThrow(RangeError);
  });
});

describe("formatDate", () => {
  it("formats in en-US by default", () => {
    expect(formatDate("2026-11-15")).toBe("Nov 15, 2026");
  });

  it("keeps the calendar day regardless of time zone", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("rejects malformed dates", () => {
    expect(() => formatDate("2026-1-1")).toThrow(RangeError);
  });
});
