import type { Role } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Set by verifyToken. `shopId` here is the user's own shop (null for SUPER_ADMIN)
      user?: { userId: string; role: Role; shopId: string | null };
      // Set by shopContext: the shop this request works on
      shopId?: string;
    }
  }
}
