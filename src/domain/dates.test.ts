import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, formatRelativeTime } from "./dates";

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

describe("daysBetween", () => {
  it.each([
    ["2026-11-15", "2026-11-15", 0],
    ["2026-11-10", "2026-11-15", 5],
    ["2026-11-15", "2026-11-10", -5],
    ["2026-12-31", "2027-01-01", 1],
    ["2028-02-28", "2028-03-01", 2], // leap year
    ["2026-03-07", "2026-03-09", 2], // across US daylight-saving start
  ])("%s → %s is %i days", (from, to, days) => {
    expect(daysBetween(from, to)).toBe(days);
  });

  it("rejects malformed dates", () => {
    expect(() => daysBetween("2026-1-1", "2026-01-02")).toThrow(RangeError);
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-11-15T12:00:00.000Z");
  const ago = (seconds: number) =>
    new Date(NOW.getTime() - seconds * 1000).toISOString();

  it.each([
    [5, "just now"],
    [59, "just now"],
    [60, "1 minute ago"],
    [5 * 60, "5 minutes ago"],
    [3 * 3600, "3 hours ago"],
    [24 * 3600, "yesterday"],
    [2 * 24 * 3600, "2 days ago"],
    [7 * 24 * 3600, "last week"],
    [40 * 24 * 3600, "last month"],
    [400 * 24 * 3600, "last year"],
  ])("%i seconds ago → %s", (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), NOW)).toBe(expected);
  });

  it("handles future times", () => {
    expect(formatRelativeTime(ago(-2 * 3600), NOW)).toBe("in 2 hours");
  });

  it("rejects invalid timestamps", () => {
    expect(() => formatRelativeTime("not a date", NOW)).toThrow(RangeError);
  });
});
