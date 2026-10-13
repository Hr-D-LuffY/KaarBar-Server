import { z } from "zod";

const MAX_SEARCH_LENGTH = 100;

export const searchQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(MAX_SEARCH_LENGTH, `Search must be at most ${MAX_SEARCH_LENGTH} characters`)
    .transform((search) => search || undefined)
    .optional(),
});

export const containsSearch = (search: string) => ({
  contains: search,
  mode: "insensitive" as const,
});
