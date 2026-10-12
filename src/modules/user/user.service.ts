import { prisma } from "../../lib/prisma";
import { authUserSelect } from "../auth/auth.service";
import type { UpdateMeInput } from "./user.validation";

export const updateMe = (userId: string, { name, phone }: UpdateMeInput) =>
  prisma.user.update({ where: { id: userId }, data: { name, phone }, select: authUserSelect });
