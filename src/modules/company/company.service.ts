import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type {
  CreateCompanyInput,
  ListCompaniesQuery,
  UpdateCompanyInput,
} from "./company.validation";

const companySelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

const NOT_USED_BY_PRODUCT = { products: { none: {} } } satisfies Prisma.CompanyWhereInput;

const companyNotFound = () => new AppError(httpStatus.NOT_FOUND, "Company not found");

const assertNameAvailable = async (name: string, excludeId?: string) => {
  const existing = await prisma.company.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  if (existing) throw new AppError(httpStatus.CONFLICT, "A company with this name already exists");
};

export const listCompanies = async ({
  search,
  sortBy,
  sortOrder,
  ...pagination
}: ListCompaniesQuery) => {
  const where: Prisma.CompanyWhereInput = search ? { name: containsSearch(search) } : {};

  const [companies, total] = await prisma.$transaction([
    prisma.company.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: companySelect,
      ...getPagination(pagination),
    }),
    prisma.company.count({ where }),
  ]);

  return { companies, meta: buildPaginationMeta({ ...pagination, total }) };
};

export const createCompany = async ({ name }: CreateCompanyInput) => {
  await assertNameAvailable(name);
  return prisma.company.create({ data: { name }, select: companySelect });
};

export const updateCompany = async (id: string, { name }: UpdateCompanyInput) => {
  const company = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) throw companyNotFound();

  await assertNameAvailable(name, id);
  return prisma.company.update({ where: { id }, data: { name }, select: companySelect });
};

export const deleteCompany = async (id: string) => {
  const company = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) throw companyNotFound();

  const { count } = await prisma.company.deleteMany({ where: { id, ...NOT_USED_BY_PRODUCT } });
  if (count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This company cannot be deleted because products use it",
    );
  }
};
