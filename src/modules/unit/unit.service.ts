import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type { CreateUnitInput, ListUnitsQuery, UpdateUnitInput } from "./unit.validation";

const unitSelect = {
  id: true,
  name: true,
  symbol: true,
  decimalPlaces: true,
  createdAt: true,
  updatedAt: true,
} as const;

const NOT_USED_BY_PRODUCT = { products: { none: {} } } satisfies Prisma.UnitWhereInput;

const unitNotFound = () => new AppError(httpStatus.NOT_FOUND, "Unit not found");

const assertNameAvailable = async (name: string, excludeId?: string) => {
  const existing = await prisma.unit.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  if (existing) throw new AppError(httpStatus.CONFLICT, "A unit with this name already exists");
};

export const listUnits = async ({ search, sortBy, sortOrder, ...pagination }: ListUnitsQuery) => {
  const where: Prisma.UnitWhereInput = search
    ? { OR: [{ name: containsSearch(search) }, { symbol: containsSearch(search) }] }
    : {};

  const [units, total] = await prisma.$transaction([
    prisma.unit.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: unitSelect,
      ...getPagination(pagination),
    }),
    prisma.unit.count({ where }),
  ]);

  return { units, meta: buildPaginationMeta({ ...pagination, total }) };
};

export const createUnit = async ({ name, symbol, decimalPlaces }: CreateUnitInput) => {
  await assertNameAvailable(name);
  return prisma.unit.create({ data: { name, symbol, decimalPlaces }, select: unitSelect });
};

export const updateUnit = async (id: string, { name, symbol, decimalPlaces }: UpdateUnitInput) => {
  const unit = await prisma.unit.findUnique({ where: { id }, select: { decimalPlaces: true } });
  if (!unit) throw unitNotFound();

  if (name !== undefined) await assertNameAvailable(name, id);

  return prisma.$transaction(async (tx) => {
    // Re-checks "no product uses this unit" inside the write itself, so a product created
    // a moment ago can't slip past the lock
    if (decimalPlaces !== undefined && decimalPlaces !== unit.decimalPlaces) {
      const { count } = await tx.unit.updateMany({
        where: { id, ...NOT_USED_BY_PRODUCT },
        data: { decimalPlaces },
      });
      if (count === 0) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Decimal places cannot be changed because products already use this unit",
        );
      }
    }

    return tx.unit.update({ where: { id }, data: { name, symbol }, select: unitSelect });
  });
};

export const deleteUnit = async (id: string) => {
  const unit = await prisma.unit.findUnique({ where: { id }, select: { id: true } });
  if (!unit) throw unitNotFound();

  const { count } = await prisma.unit.deleteMany({ where: { id, ...NOT_USED_BY_PRODUCT } });
  if (count === 0) {
    throw new AppError(httpStatus.CONFLICT, "This unit cannot be deleted because products use it");
  }
};
