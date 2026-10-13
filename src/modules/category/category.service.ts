import { prisma } from "../../lib/prisma";

export const listCategories = () =>
  prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
