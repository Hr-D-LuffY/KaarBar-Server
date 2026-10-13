import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_PRODUCT_NAME_LENGTH = 150;
const MAX_PACK_NAME_LENGTH = 50;
const MAX_PACK_SIZE = 1_000_000;
// lowStockLevel is stored in an Int column
const MAX_LOW_STOCK_LEVEL = 2_147_483_647;
const CATALOG_SORT_FIELDS = ["name", "createdAt"] as const;
const SHOP_PRODUCT_SORT_FIELDS = ["name", "createdAt", "stock"] as const;

const idSchema = (label: string) => z.uuid(`Invalid ${label} id`);

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(MAX_PRODUCT_NAME_LENGTH, `Name must be at most ${MAX_PRODUCT_NAME_LENGTH} characters`);

const packNameSchema = z
  .string()
  .trim()
  .min(1, "Pack name cannot be empty")
  .max(MAX_PACK_NAME_LENGTH, `Pack name must be at most ${MAX_PACK_NAME_LENGTH} characters`);

const packSizeSchema = z
  .number()
  .int("Pack size must be a whole number")
  .min(1, "Pack size must be at least 1")
  .max(MAX_PACK_SIZE, `Pack size must be at most ${MAX_PACK_SIZE}`);

const lowStockLevelSchema = z
  .number()
  .int("Low stock level must be a whole number")
  .min(0, "Low stock level cannot be negative")
  .max(MAX_LOW_STOCK_LEVEL, "Low stock level is too large");

const productIdParamsSchema = z.object({ id: idSchema("product") });

export const listCatalogSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(CATALOG_SORT_FIELDS, "name", "asc").shape,
    categoryId: idSchema("category").optional(),
    companyId: idSchema("company").optional(),
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(SHOP_PRODUCT_SORT_FIELDS, "name", "asc").shape,
    categoryId: idSchema("category").optional(),
    companyId: idSchema("company").optional(),
    unitId: idSchema("unit").optional(),
  }),
});

export const productOptionsSchema = z.object({
  query: z.object({
    categoryId: idSchema("category").optional(),
    name: z
      .string()
      .trim()
      .max(MAX_PRODUCT_NAME_LENGTH)
      .transform((name) => name || undefined)
      .optional(),
  }),
});

export const createProductSchema = z.object({
  body: z
    .object({
      categoryId: idSchema("category"),
      companyId: idSchema("company"),
      typeId: idSchema("product type").optional(),
      unitId: idSchema("unit"),
      name: nameSchema,
      packName: packNameSchema.optional(),
      packSize: packSizeSchema.optional(),
      lowStockLevel: lowStockLevelSchema.optional(),
    })
    .refine((body) => (body.packName === undefined) === (body.packSize === undefined), {
      message: "Pack name and pack size must be provided together",
      path: ["packSize"],
    }),
});

export const productIdSchema = z.object({ params: productIdParamsSchema });

export const updateProductSchema = z.object({
  params: productIdParamsSchema,
  body: z
    .object({
      name: nameSchema.optional(),
      typeId: idSchema("product type").nullable().optional(),
      unitId: idSchema("unit").optional(),
      packName: packNameSchema.nullable().optional(),
      packSize: packSizeSchema.nullable().optional(),
    })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      message: "Provide at least one field to update",
    }),
});

export const updateLowStockLevelSchema = z.object({
  params: productIdParamsSchema,
  body: z.object({ lowStockLevel: lowStockLevelSchema }),
});

export type ListCatalogQuery = z.infer<typeof listCatalogSchema>["query"];
export type ListProductsQuery = z.infer<typeof listProductsSchema>["query"];
export type ProductOptionsQuery = z.infer<typeof productOptionsSchema>["query"];
export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];
export type UpdateLowStockLevelInput = z.infer<typeof updateLowStockLevelSchema>["body"];
