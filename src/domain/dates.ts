import { moneyFormat } from "@/config/business";
import type { IsoDate } from "./invoice-status";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Adds (or with a negative number, subtracts) calendar days to a `YYYY-MM-DD` date.
 * Works in UTC internally, so daylight-saving changes can't shift the result by a day.
 */
export function addDays(date: IsoDate, days: number): IsoDate {
  const match = ISO_DATE.exec(date);
  if (!match || !Number.isInteger(days)) {
    throw new RangeError(
      `addDays expects YYYY-MM-DD and whole days, got "${date}", ${days}`,
    );
  }
  const [, y, m, d] = match;
  const result = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days));
  const yyyy = String(result.getUTCFullYear()).padStart(4, "0");
  const mm = String(result.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(result.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Formats a `YYYY-MM-DD` date for display (e.g. "Nov 15, 2026"), without time-zone shifts. */
export function formatDate(
  date: IsoDate,
  locale: string = moneyFormat.locale,
): string {
  const match = ISO_DATE.exec(date);
  if (!match)
    throw new RangeError(`formatDate expects YYYY-MM-DD, got "${date}"`);
  const [, y, m, d] = match;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))));
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). Time-zone safe. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const toUtc = (date: IsoDate) => {
    const match = ISO_DATE.exec(date);
    if (!match)
      throw new RangeError(`daysBetween expects YYYY-MM-DD, got "${date}"`);
    const [, y, m, d] = match;
    return Date.UTC(Number(y), Number(m) - 1, Number(d));
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * "just now", "5 minutes ago", "yesterday", "2 days ago", "last month"…
 * `now` is passed in so callers and tests control it.
 */
export function formatRelativeTime(
  at: string,
  now: Date,
  locale: string = moneyFormat.locale,
): string {
  const seconds = (new Date(at).getTime() - now.getTime()) / 1000;
  if (!Number.isFinite(seconds)) {
    throw new RangeError(
      `formatRelativeTime expects an ISO timestamp, got "${at}"`,
    );
  }
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size)
      return format.format(Math.round(seconds / size), unit);
  }
  return "just now"; // under a minute either way
}

/** Full local date and time for tooltips, e.g. "Nov 13, 2026, 2:05 PM". */
export function formatDateTime(
  at: string,
  locale: string = moneyFormat.locale,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(at));
}
