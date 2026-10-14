import httpStatus from "http-status";
import { z } from "zod";
import { AppError } from "./AppError";

// Bangladesh has no daylight saving, so the offset is fixed
const DHAKA_UTC_OFFSET = "+06:00";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const dateRangeQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

const MS_PER_HOUR = 60 * 60 * 1000;
const DHAKA_UTC_OFFSET_HOURS = 6;
const YEAR_MONTH_LENGTH = "YYYY-MM".length;
const ISO_DATE_LENGTH = "YYYY-MM-DD".length;

export const startOfDhakaDay = (date: string) => new Date(`${date}T00:00:00${DHAKA_UTC_OFFSET}`);

// The Dhaka calendar date of a moment, e.g. "2026-10-14"
export const toDhakaDate = (moment: Date) =>
  new Date(moment.getTime() + DHAKA_UTC_OFFSET_HOURS * MS_PER_HOUR)
    .toISOString()
    .slice(0, ISO_DATE_LENGTH);

// The current calendar month in Dhaka, e.g. "2026-10"
export const currentDhakaMonth = () => toDhakaDate(new Date()).slice(0, YEAR_MONTH_LENGTH);

// `to` is inclusive for the caller, so the filter ends at the start of the next day (exclusive)
export const buildDateRange = ({ from, to }: DateRangeQuery) => {
  if (from && to && from > to) {
    throw new AppError(httpStatus.BAD_REQUEST, "Validation failed", [
      { field: "from", message: "Must not be after the end date" },
    ]);
  }

  return {
    ...(from && { gte: startOfDhakaDay(from) }),
    ...(to && { lt: new Date(startOfDhakaDay(to).getTime() + MS_PER_DAY) }),
  };
};
