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
