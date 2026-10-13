import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_COMPANY_NAME_LENGTH = 100;
const COMPANY_SORT_FIELDS = ["name", "createdAt"] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(MAX_COMPANY_NAME_LENGTH, `Name must be at most ${MAX_COMPANY_NAME_LENGTH} characters`);

const companyIdParamsSchema = z.object({ id: z.uuid("Invalid company id") });

export const listCompaniesSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(COMPANY_SORT_FIELDS, "name", "asc").shape,
  }),
});

export const createCompanySchema = z.object({ body: z.object({ name: nameSchema }) });

export const updateCompanySchema = z.object({
  params: companyIdParamsSchema,
  body: z.object({ name: nameSchema }),
});

export const deleteCompanySchema = z.object({ params: companyIdParamsSchema });

export type ListCompaniesQuery = z.infer<typeof listCompaniesSchema>["query"];
export type CreateCompanyInput = z.infer<typeof createCompanySchema>["body"];
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>["body"];
