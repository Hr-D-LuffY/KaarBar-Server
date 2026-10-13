import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type {
  CreateProductTypeInput,
  ListProductTypesQuery,
  UpdateProductTypeInput,
} from "./product-type.validation";

const productTypeSelect = {
  id: true,
  name: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const NOT_USED_BY_PRODUCT = { products: { none: {} } } satisfies Prisma.ProductTypeWhereInput;

const productTypeNotFound = () => new AppError(httpStatus.NOT_FOUND, "Product type not found");

const assertNameAvailable = async (categoryId: string, name: string, excludeId?: string) => {
  const existing = await prisma.productType.findFirst({
    where: {
      categoryId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This category already has a product type with this name",
    );
  }
};

export const listProductTypes = async ({
  search,
  categoryId,
  sortBy,
  sortOrder,
  ...pagination
}: ListProductTypesQuery) => {
  const where: Prisma.ProductTypeWhereInput = {
    ...(categoryId && { categoryId }),
    ...(search && { name: containsSearch(search) }),
  };

  const [productTypes, total] = await prisma.$transaction([
    prisma.productType.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: productTypeSelect,
      ...getPagination(pagination),
    }),
    prisma.productType.count({ where }),
  ]);

  return { productTypes, meta: buildPaginationMeta({ ...pagination, total }) };
};

export const createProductType = async ({ categoryId, name }: CreateProductTypeInput) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) throw new AppError(httpStatus.NOT_FOUND, "Category not found");

  await assertNameAvailable(categoryId, name);
  return prisma.productType.create({ data: { categoryId, name }, select: productTypeSelect });
};

export const updateProductType = async (id: string, { name }: UpdateProductTypeInput) => {
  const productType = await prisma.productType.findUnique({
    where: { id },
    select: { categoryId: true },
  });
  if (!productType) throw productTypeNotFound();

  await assertNameAvailable(productType.categoryId, name, id);
  return prisma.productType.update({ where: { id }, data: { name }, select: productTypeSelect });
};

export const deleteProductType = async (id: string) => {
  const productType = await prisma.productType.findUnique({ where: { id }, select: { id: true } });
  if (!productType) throw productTypeNotFound();

  const { count } = await prisma.productType.deleteMany({
    where: { id, ...NOT_USED_BY_PRODUCT },
  });
  if (count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This product type cannot be deleted because products use it",
    );
  }
};
