import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_PRODUCT_TYPE_NAME_LENGTH = 100;
const PRODUCT_TYPE_SORT_FIELDS = ["name", "createdAt"] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(
    MAX_PRODUCT_TYPE_NAME_LENGTH,
    `Name must be at most ${MAX_PRODUCT_TYPE_NAME_LENGTH} characters`,
  );

const categoryIdSchema = z.uuid("Invalid category id");

const productTypeIdParamsSchema = z.object({ id: z.uuid("Invalid product type id") });

export const listProductTypesSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(PRODUCT_TYPE_SORT_FIELDS, "name", "asc").shape,
    categoryId: categoryIdSchema.optional(),
  }),
});

export const createProductTypeSchema = z.object({
  body: z.object({ categoryId: categoryIdSchema, name: nameSchema }),
});

export const updateProductTypeSchema = z.object({
  params: productTypeIdParamsSchema,
  body: z.object({ name: nameSchema }),
});

export const deleteProductTypeSchema = z.object({ params: productTypeIdParamsSchema });

export type ListProductTypesQuery = z.infer<typeof listProductTypesSchema>["query"];
export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>["body"];
export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>["body"];
