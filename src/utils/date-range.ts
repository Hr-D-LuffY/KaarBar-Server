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

const startOfDhakaDay = (date: string) => new Date(`${date}T00:00:00${DHAKA_UTC_OFFSET}`);

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
