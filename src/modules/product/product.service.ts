import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type {
  CreateProductInput,
  ListCatalogQuery,
  ListProductsQuery,
  ProductOptionsQuery,
  UpdateLowStockLevelInput,
  UpdateProductInput,
} from "./product.validation";

const AVG_COST_DECIMAL_PLACES = 4;

const productSelect = {
  id: true,
  name: true,
  packName: true,
  packSize: true,
  category: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  type: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true, symbol: true, decimalPlaces: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const shopProductSelect = {
  lowStockLevel: true,
  stock: true,
  avgCost: true,
  product: { select: productSelect },
} as const;

type ShopProductRow = Prisma.ShopProductGetPayload<{ select: typeof shopProductSelect }>;

// Units are locked once any shop holds stock of the product or it appears in a restock or order
const UNIT_LOCKED_BY_USE = {
  shopProducts: { none: { stock: { not: 0 } } },
  restockItems: { none: {} },
  orderItems: { none: {} },
} satisfies Prisma.ProductWhereInput;

const productNotFound = () => new AppError(httpStatus.NOT_FOUND, "Product not found");

const toShopProductView = ({ product, lowStockLevel, stock, avgCost }: ShopProductRow) => ({
  ...product,
  lowStockLevel,
  stock,
  avgCost: avgCost.toFixed(AVG_COST_DECIMAL_PLACES),
});

const assertTypeInCategory = async (typeId: string, categoryId: string) => {
  const type = await prisma.productType.findUnique({
    where: { id: typeId },
    select: { categoryId: true },
  });
  if (!type) throw new AppError(httpStatus.NOT_FOUND, "Product type not found");
  if (type.categoryId !== categoryId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Validation failed", [
      { field: "typeId", message: "Product type does not belong to this category" },
    ]);
  }
};

const assertUnitExists = async (unitId: string) => {
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
  if (!unit) throw new AppError(httpStatus.NOT_FOUND, "Unit not found");
};

const assertReferencesExist = async ({
  categoryId,
  companyId,
  typeId,
  unitId,
}: Pick<CreateProductInput, "categoryId" | "companyId" | "typeId" | "unitId">) => {
  const [category, company] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }),
  ]);
  if (!category) throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  if (!company) throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  await assertUnitExists(unitId);
  if (typeId) await assertTypeInCategory(typeId, categoryId);
};

// The shared catalog has no unique key, so the same item is stopped here instead of being entered twice
const assertNotDuplicate = async (
  {
    categoryId,
    companyId,
    typeId,
    name,
    packSize,
  }: {
    categoryId: string;
    companyId: string;
    typeId: string | null;
    name: string;
    packSize: number | null;
  },
  excludeId?: string,
) => {
  const existing = await prisma.product.findFirst({
    where: {
      categoryId,
      companyId,
      typeId,
      packSize,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "This product already exists in the shared catalog");
  }
};

const getShopProduct = async (shopId: string, productId: string) => {
  const shopProduct = await prisma.shopProduct.findFirst({
    where: { shopId, productId, deletedAt: null },
    select: shopProductSelect,
  });
  if (!shopProduct) throw productNotFound();
  return toShopProductView(shopProduct);
};

const buildShopProductOrderBy = (
  sortBy: ListProductsQuery["sortBy"],
  sortOrder: ListProductsQuery["sortOrder"],
): Prisma.ShopProductOrderByWithRelationInput =>
  sortBy === "name" ? { product: { name: sortOrder } } : buildOrderBy(sortBy, sortOrder);

export const listCatalog = async (
  shopId: string,
  { search, categoryId, companyId, sortBy, sortOrder, ...pagination }: ListCatalogQuery,
) => {
  const where: Prisma.ProductWhereInput = {
    ...(categoryId && { categoryId }),
    ...(companyId && { companyId }),
    ...(search && { name: containsSearch(search) }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: {
        ...productSelect,
        shopProducts: { where: { shopId, deletedAt: null }, select: { id: true } },
      },
      ...getPagination(pagination),
    }),
    prisma.product.count({ where }),
  ]);

  const products = rows.map(({ shopProducts, ...product }) => ({
    ...product,
    inShop: shopProducts.length > 0,
  }));

  return { products, meta: buildPaginationMeta({ ...pagination, total }) };
};

export const listProducts = async (
  shopId: string,
  { search, categoryId, companyId, unitId, sortBy, sortOrder, ...pagination }: ListProductsQuery,
) => {
  const where: Prisma.ShopProductWhereInput = {
    shopId,
    deletedAt: null,
    product: {
      ...(categoryId && { categoryId }),
      ...(companyId && { companyId }),
      ...(unitId && { unitId }),
      ...(search && { name: containsSearch(search) }),
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where,
      orderBy: buildShopProductOrderBy(sortBy, sortOrder),
      select: shopProductSelect,
      ...getPagination(pagination),
    }),
    prisma.shopProduct.count({ where }),
  ]);

  return {
    products: rows.map(toShopProductView),
    meta: buildPaginationMeta({ ...pagination, total }),
  };
};

export const getProduct = getShopProduct;

const uniqueById = <T extends { id: string; name: string }>(items: T[]) =>
  [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

export const getProductOptions = async (
  shopId: string,
  { categoryId, name }: ProductOptionsQuery,
) => {
  const rows = await prisma.shopProduct.findMany({
    where: { shopId, deletedAt: null, ...(categoryId && { product: { categoryId } }) },
    select: {
      product: {
        select: {
          name: true,
          type: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  const products = rows.map((row) => row.product);
  const matching = name
    ? products.filter((product) => product.name.toLowerCase() === name.toLowerCase())
    : products;

  return {
    names: [...new Set(products.map((product) => product.name))].sort((a, b) => a.localeCompare(b)),
    types: uniqueById(matching.flatMap((product) => (product.type ? [product.type] : []))),
    companies: uniqueById(matching.map((product) => product.company)),
  };
};

export const createProduct = async (
  shopId: string,
  {
    categoryId,
    companyId,
    typeId,
    unitId,
    name,
    packName,
    packSize,
    lowStockLevel,
  }: CreateProductInput,
) => {
  await assertReferencesExist({ categoryId, companyId, typeId, unitId });
  await assertNotDuplicate({
    categoryId,
    companyId,
    typeId: typeId ?? null,
    name,
    packSize: packSize ?? null,
  });

  const shopProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { categoryId, companyId, typeId, unitId, name, packName, packSize },
      select: { id: true },
    });
    return tx.shopProduct.create({
      data: { shopId, productId: product.id, lowStockLevel },
      select: shopProductSelect,
    });
  });

  return toShopProductView(shopProduct);
};

export const addProductToShop = async (shopId: string, productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw productNotFound();

  const existing = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId, productId } },
    select: { id: true, deletedAt: true },
  });
  if (existing && !existing.deletedAt) {
    throw new AppError(httpStatus.CONFLICT, "This product is already in your shop");
  }

  const shopProduct = existing
    ? await prisma.shopProduct.update({
        where: { id: existing.id },
        data: { deletedAt: null },
        select: shopProductSelect,
      })
    : await prisma.shopProduct.create({
        data: { shopId, productId },
        select: shopProductSelect,
      });

  return toShopProductView(shopProduct);
};

export const updateProduct = async (
  id: string,
  { name, typeId, unitId, packName, packSize }: UpdateProductInput,
) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      categoryId: true,
      companyId: true,
      typeId: true,
      unitId: true,
      name: true,
      packName: true,
      packSize: true,
    },
  });
  if (!product) throw productNotFound();

  const next = {
    name: name ?? product.name,
    typeId: typeId === undefined ? product.typeId : typeId,
    unitId: unitId ?? product.unitId,
    packName: packName === undefined ? product.packName : packName,
    packSize: packSize === undefined ? product.packSize : packSize,
  };

  if ((next.packName === null) !== (next.packSize === null)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Validation failed", [
      { field: "packSize", message: "Pack name and pack size must be provided together" },
    ]);
  }

  const unitChanged = next.unitId !== product.unitId;
  if (unitChanged) await assertUnitExists(next.unitId);
  if (typeId) await assertTypeInCategory(typeId, product.categoryId);
  await assertNotDuplicate(
    {
      categoryId: product.categoryId,
      companyId: product.companyId,
      typeId: next.typeId,
      name: next.name,
      packSize: next.packSize,
    },
    id,
  );

  return prisma.$transaction(async (tx) => {
    // Re-checks the lock inside the write itself, so stock that arrived a moment ago can't slip past it
    if (unitChanged) {
      const { count } = await tx.product.updateMany({
        where: { id, ...UNIT_LOCKED_BY_USE },
        data: { unitId: next.unitId },
      });
      if (count === 0) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Unit cannot be changed because stock or history already exists for this product",
        );
      }
    }

    return tx.product.update({
      where: { id },
      data: {
        name: next.name,
        typeId: next.typeId,
        packName: next.packName,
        packSize: next.packSize,
      },
      select: productSelect,
    });
  });
};

export const updateLowStockLevel = async (
  shopId: string,
  productId: string,
  { lowStockLevel }: UpdateLowStockLevelInput,
) => {
  const { count } = await prisma.shopProduct.updateMany({
    where: { shopId, productId, deletedAt: null },
    data: { lowStockLevel },
  });
  if (count === 0) throw productNotFound();

  return getShopProduct(shopId, productId);
};

export const removeProductFromShop = async (shopId: string, productId: string) => {
  const shopProduct = await prisma.shopProduct.findFirst({
    where: { shopId, productId, deletedAt: null },
    select: { id: true },
  });
  if (!shopProduct) throw productNotFound();

  const { count } = await prisma.shopProduct.updateMany({
    where: { id: shopProduct.id, stock: 0, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This product cannot be removed while it still has stock",
    );
  }
};
