import { prisma } from "../../lib/prisma";
import type { UpdateShopInput } from "./shop.validation";

const shopSelect = {
  id: true,
  shopName: true,
  phone: true,
  address: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getShop = (shopId: string) =>
  prisma.shop.findUniqueOrThrow({ where: { id: shopId }, select: shopSelect });

export const updateShop = (shopId: string, { shopName, phone, address }: UpdateShopInput) =>
  prisma.shop.update({
    where: { id: shopId },
    data: { shopName, phone, address },
    select: shopSelect,
  });
